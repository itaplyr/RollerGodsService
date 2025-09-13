import pako from "pako";

export default {
  name: "Tool 1",
  action: async ({ authToken, csrfToken, itemId, priceThreshold, page }) => {
    console.log("Tool1 started...");

    function os(t) { return Uint8Array.from(atob(t), c => c.charCodeAt(0)); }
    function ds(t) {
      const c = new DataView(t.buffer);
      let a = 0;
      const s = c.getUint16(a); a += 2;
      const n = Number(c.getBigUint64(a)); a += 8;
      const l = [];
      for (let r = 0; r < s; r++) {
        const o = c.getUint32(a); a += 4;
        const i = c.getUint32(a); a += 4;
        l.push([o, i]);
      }
      return [l, n];
    }
    function us(t, c) {
      let a = c;
      const s = [];
      for (const [n, l] of t) {
        a += n;
        if (l !== 0) s.push([a, l]);
      }
      return s;
    }
    function decodeOffers(t) {
      const c = os(t);
      const a = pako.inflate(c);
      const [s, n] = ds(a);
      return us(s, n);
    }

    async function fetchTradeOffers() {
      return await page.evaluate(
        async ({ itemId, authToken, csrfToken }) => {
          try {
            const res = await fetch(
              `https://rollercoin.com/api/marketplace/item-info?itemId=${itemId}&itemType=mutation_component&currency=RLT`,
              {
                method: "GET",
                credentials: "include",
                headers: {
                  "Authorization": "Bearer " + authToken,
                  "CSRF-Token": csrfToken,
                  "X-KL-Ajax-Request": "Ajax_Request",
                  "Accept": "application/json",
                },
              }
            );
            const text = await res.text();
            const json = JSON.parse(text);
            return json.data.tradeOffers;
          } catch (err) {
            console.error("Error decoding tradeOffers:", err);
            return null;
          }
        },
        { itemId, authToken, csrfToken }
      );
    }

    async function purchaseItem(price, quantity) {
      return await page.evaluate(
        async ({ itemId, authToken, csrfToken, price, quantity }) => {
          try {
            const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
              method: "POST",
              credentials: "include",
              headers: {
                "Authorization": "Bearer " + authToken,
                "CSRF-Token": csrfToken,
                "X-KL-Ajax-Request": "Ajax_Request",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                challenge: "",
                action: "marketplace",
                itemId,
                itemType: "mutation_component",
                totalCount: quantity,
                currency: "RLT",
                totalPrice: price * quantity,
              }),
            });
            return await res.json();
          } catch (err) {
            console.error("Error during purchase:", err);
            return null;
          }
        },
        { itemId, authToken, csrfToken, price, quantity }
      );
    }

    async function getFirstOffer() {
      try {
        const tradeOffers = await fetchTradeOffers();
        if (!tradeOffers) return null;
        const offers = decodeOffers(tradeOffers);
        return offers[0] || null;
      } catch (err) {
        console.error("Error in getFirstOffer:", err);
        return null;
      }
    }

    async function runTool() {
      while (true) {
        const offer = await getFirstOffer();
        if (!offer) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        const [price, quantity] = offer;
        console.log("First offer - Price:", price, "Quantity:", quantity);

        if (price < priceThreshold) {
          console.log("Price below threshold, attempting purchase...");
          const response = await purchaseItem(price, quantity);
          console.log("Purchase response:", response);
        }

        await new Promise(r => setTimeout(r, 50));
      }
    }

    runTool();
  },
  stop: () => console.log("Tool1 stopped.")
};