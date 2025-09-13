import fetch from "node-fetch";
import pako from "pako";

export default {
  name: "Tool1",
  action: ({ itemId, priceThreshold, authToken, csrfToken }) => {
    let running = true;

    function decodeOffers(t) {
      const bytes = Uint8Array.from(Buffer.from(t, "base64"));
      const inflated = pako.inflate(bytes);
      const view = new DataView(inflated.buffer);
      let offset = 0;
      const s = view.getUint16(offset); offset += 2;
      const n = Number(view.getBigUint64(offset)); offset += 8;
      const arr = [];
      for (let i = 0; i < s; i++) {
        const o = view.getUint32(offset); offset += 4;
        const l = view.getUint32(offset); offset += 4;
        arr.push([o, l]);
      }
      let a = n;
      const result = [];
      for (const [delta, val] of arr) {
        a += delta;
        if (val !== 0) result.push([a, val]);
      }
      return result;
    }

    async function fetchTradeOffers() {
      const url = `https://rollercoin.com/api/marketplace/item-info?itemId=${itemId}&itemType=mutation_component&currency=RLT`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "CSRF-Token": csrfToken,
          "X-KL-Ajax-Request": "Ajax_Request",
          "Accept": "application/json"
        }
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!json.success) throw new Error(json.error || "API error");
        return decodeOffers(json.data.tradeOffers);
      } catch (err) {
        console.error("Failed to parse tradeOffers:", text);
        throw err;
      }
    }

    async function buyItem(price, quantity) {
      const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "CSRF-Token": csrfToken,
          "X-KL-Ajax-Request": "Ajax_Request",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          challenge: "",
          action: "marketplace",
          itemId,
          itemType: "mutation_component",
          totalCount: quantity,
          currency: "RLT",
          totalPrice: price * quantity
        })
      });
      return res.json();
    }

    async function runTool() {
      while (running) {
        try {
          const offers = await fetchTradeOffers();
          if (!offers.length) {
            await new Promise(r => setTimeout(r, 50));
            continue;
          }
          const [price, quantity] = offers[0];
          console.log("Offer:", price, quantity);

          if (price < priceThreshold) {
            console.log("Buying...");
            const res = await buyItem(price, quantity);
            console.log("Purchase response:", res);
          }
        } catch (err) {
          console.error("Error in Tool1 loop:", err);
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    runTool();

    return {
      stop: () => { running = false; console.log("Tool1 stopped"); }
    };
  }
};
