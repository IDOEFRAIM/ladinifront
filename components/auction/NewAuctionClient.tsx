"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAuctionClient({ serverCreateAuction }: { serverCreateAuction?: (payload: any) => Promise<any> }) {
  const router = useRouter();
  const [form, setForm] = useState({
    subCategoryId: "",
    quantity: "",
    unit: "kg",
    maxPricePerUnit: "",
    deadline: "",
    targetZoneId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.subCategoryId || !form.quantity || !form.maxPricePerUnit || !form.deadline) {
      setError("Veuillez remplir les champs requis.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        subCategoryId: form.subCategoryId,
        quantity: Number(form.quantity),
        unit: form.unit,
        maxPricePerUnit: Number(form.maxPricePerUnit),
        deadline: new Date(form.deadline).toISOString(),
        targetZoneId: form.targetZoneId || undefined,
      } as any;

      if (typeof serverCreateAuction === 'function') {
        const res = await serverCreateAuction(payload);
        if (!res || !res.success) {
          setError(res?.error || 'Erreur lors de la création de l\'enchère.');
          setLoading(false);
          return;
        }
        router.push(`/auctions/${res.data.id}`);
        return;
      }

      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur lors de la création de l'enchère.");
        setLoading(false);
        return;
      }

      router.push(`/auctions/${data.data.id}`);
    } catch (err) {
      console.error(err);
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Créer une enchère</h1>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Sous-catégorie (id)</label>
          <input
            name="subCategoryId"
            value={form.subCategoryId}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
            placeholder="ex: subCategory-uuid"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantité</label>
            <input
              name="quantity"
              type="number"
              value={form.quantity}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              min={0}
              step="any"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unité</label>
            <select name="unit" value={form.unit} onChange={onChange} className="w-full border rounded px-3 py-2">
              <option value="kg">kg</option>
              <option value="t">t</option>
              <option value="pc">pc</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Prix maximum / unité</label>
          <input
            name="maxPricePerUnit"
            type="number"
            value={form.maxPricePerUnit}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
            min={0}
            step="any"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date limite</label>
          <input
            name="deadline"
            type="datetime-local"
            value={form.deadline}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Zone cible (optionnel, id)</label>
          <input
            name="targetZoneId"
            value={form.targetZoneId}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
            placeholder="ex: zone-uuid"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Création..." : "Créer l'enchère"}
          </button>
        </div>
      </form>
    </div>
  );
}
