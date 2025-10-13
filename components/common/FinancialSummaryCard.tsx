import React from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

interface FinancialSummaryCardProps {
  subtotal: number
  tax: number
  total: number
  dueDate?: string
  paymentTerms?: string
  currency?: string
  className?: string
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  subtotal,
  tax,
  total,
  dueDate,
  paymentTerms,
  currency = "€",
  className = "",
}) => (
  <Card className={className + " border-green-200 bg-green-50"}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-green-800">
        Récapitulatif financier
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Sous-total HT:</span>
        <span className="font-medium">{subtotal.toFixed(2)} {currency}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">TVA:</span>
        <span className="font-medium">{tax.toFixed(2)} {currency}</span>
      </div>
      <div className="border-t pt-2">
        <div className="flex justify-between text-lg font-bold text-green-800">
          <span>Total TTC:</span>
          <span>{total.toFixed(2)} {currency}</span>
        </div>
      </div>
      {(dueDate || paymentTerms) && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {dueDate && <p>Échéance: {dueDate}</p>}
          {paymentTerms && <p>Conditions: {paymentTerms}</p>}
        </div>
      )}
    </CardContent>
  </Card>
)
