// tool1-node.js
import fetch from "node-fetch";
import pako from "pako";

let running = false;

export default {
  name: "Tool1",
  /**
   * Start Tool1
   * @param {object} options
   * @param {string} options.itemId - Item ID to purchase
   * @param {number} options.priceThreshold - Max price to buy
   * @param {string} options.authToken - Authorization token
   * @param {string} options.csrfToken - CSRF token
   */
  action: async ({ itemId, priceThreshold, authToken, csrfToken }) => {
    if (running) {
      console.warn("Tool1 is already running!");
      return;
    }
    running = true;

    if (!itemId || !priceThreshold || !authToken || !csrfToken) {
      console.error("Missing required parameters.");
      running = false;
      return;
    }

    // === decoding helpers ===
    function os(t) { return Uint8Array.from(Buffer.from(t, "base64")); }
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
    function gs(t) {
      const c = os(t);
      const a = pako.inflate(c);
      const [s, n] = ds(a);
      return us(s, n);
    }

    const itemType = "mutation_component";
    const currency = "RLT";

    // === API helpers ===
    async function fetchTradeOffers() {
      const res = await fetch(
        `https://rollercoin.com/api/marketplace/item-info?itemId=${itemId}&itemType=${itemType}&currency=${currency}`,
        {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + authToken,
            "CSRF-Token": csrfToken,
            "X-KL-Ajax-Request": "Ajax_Request",
            "Accept": "application/json",
          },
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "API error");
      return json.data.tradeOffers;
    }

    async function getFirstOffer() {
      try {
        const tradeOffers = await fetchTradeOffers();
        const offers = gs(tradeOffers);
        return offers[0] || null;
      } catch (err) {
        console.error("Error decoding tradeOffers:", err);
        return null;
      }
    }

    async function buyItem(price, quantity) {
      try {
        const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
          method: "POST",
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
            itemType,
            totalCount: quantity,
            currency,
            totalPrice: price * quantity,
          }),
        });
        return res.json();
      } catch (err) {
        console.error("Error during purchase:", err);
        return null;
      }
    }

    // === main loop ===
    async function runTool() {
      if (!running) return;
      let purchased = false;

      while (running && !purchased) {
        const offer = await getFirstOffer();
        if (!offer) {
          await new Promise(r => setTimeout(r, 50));
          continue;
        }

        const [price, quantity] = offer;
        console.log("First offer - Price:", price, "Quantity:", quantity);

        if (price < priceThreshold) {
          console.log("Price below threshold, attempting purchase...");
          const json = await buyItem(price, quantity);
          if (!json) break;

          console.log("Purchase response:", json);
          if (json.error === "Conflict") {
            console.warn("Purchase conflict (409), stopping current iteration.");
          } else {
            console.log("✅ Purchase successful!");
          }
          purchased = true;
        }

        await new Promise(r => setTimeout(r, 50));
      }

      if (running) {
        console.log("🔄 Restarting Tool1 for next purchase...");
        setTimeout(runTool, 100);
      }
    }

    runTool();
  },

  stop: () => {
    running = false;
    console.log("🛑 Tool1 stopped!");
  },
};
