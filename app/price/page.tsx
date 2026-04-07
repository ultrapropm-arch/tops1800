"use client";
import { useState } from "react";

export default function PricePage() {
  const [sqft, setSqft] = useState("");
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState<number | null>(null);
const [sink, setSink] = useState(false);
const [backsplash, setBacksplash] = useState(false);
  const calculatePrice = () => {
    const baseRate = 9; // $9 per sqft

    let materialExtra = 0;

    if (material === "Quartz") materialExtra = 2;
    if (material === "Granite") materialExtra = 1;
    if (material === "Marble") materialExtra = 3;

    const total = Number(sqft) * (baseRate + materialExtra);
    setPrice(total);
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        Instant Price Calculator
      </h1>

      <div className="max-w-xl space-y-4">

        <input
          type="number"
          placeholder="Square Footage"
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          className="w-full p-3 rounded bg-gray-900 border border-gray-700"
        />

        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className="w-full p-3 rounded bg-gray-900 border border-gray-700"
        >
          <option value="">Material</option>
          <option>Quartz</option>
          <option>Granite</option>
          <option>Marble</option>
        </select>
<div className="flex flex-col gap-2 text-left">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={sink}
      onChange={(e) => setSink(e.target.checked)}
    />
    Reattach Sink (+$175)
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={backsplash}
      onChange={(e) => setBacksplash(e.target.checked)}
    />
    Backsplash (+$10/sqft)
  </label>
</div>
        <button
          onClick={calculatePrice}
          className="w-full bg-yellow-500 text-black py-3 rounded-xl font-semibold hover:bg-yellow-400"
        >
          Calculate Price
        </button>

        {price !== null && (
          <div className="text-xl font-bold text-green-400 mt-4">
            Estimated Price: ${price}
          </div>
        )}

      </div>

    </main>
  );
}