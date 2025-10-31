"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { Unit } from "@/types/types";
import UnitManager from "@/components/unit/unit-manager";
import { db } from "@/lib/database";

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnits = async () => {
      setLoading(true);
      try {
        const result = await db.units.getAll();
        if (result.success) {
          setUnits(result.data || []);
        }
      } catch (error) {
        console.error("Failed to load units:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestion des unités</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des unités</h1>
        <p className="text-muted-foreground">
          Gérez les unités utilisées pour vos produits ({units.length} unité{units.length !== 1 ? 's' : ''})
        </p>
      </div>
      
      <UnitManager 
        units={units}
        onUnitsChange={setUnits}
        onClose={() => {}}
      />
    </div>
  );
}

