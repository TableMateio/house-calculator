// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, Home, Percent, PieChart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ResultsPanel({ derived, inputs, formatCurrency, formatPercent }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mortgage Details</CardTitle>
        <CardDescription>Calculated values based on your inputs</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="monthly">Monthly Payments</TabsTrigger>
            <TabsTrigger value="loan">Loan Details</TabsTrigger>
            <TabsTrigger value="cash">Cash Requirements</TabsTrigger>
            <TabsTrigger value="networth">Net Worth</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Principal & Interest</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.pi)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monthly payment toward loan principal and interest</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Home className="h-4 w-4 mr-1" />
                        <span>Property Tax</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.tax)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monthly property tax payment ({formatPercent(inputs.pt_rate)} annually)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Home className="h-4 w-4 mr-1" />
                        <span>Insurance + HOA</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.ins)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monthly home insurance and HOA fees ({formatPercent(inputs.hi_rate)} annually)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Percent className="h-4 w-4 mr-1" />
                        <span>PMI</span>
                      </div>
                      <div className="text-xl font-bold">{derived.pmi > 0 ? formatCurrency(derived.pmi) : "N/A"}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Private Mortgage Insurance - required when down payment is less than 20%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm font-medium">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Total Monthly Payment (PITI)</span>
                </div>
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  {formatCurrency(derived.piti)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Monthly Income</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.gmi)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Combined monthly gross income</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Layoff Survival</span>
                      </div>
                      <div className="text-xl font-bold">{derived.layoff_cash_months.toFixed(1)} months</div>
                      <div className="text-xs text-muted-foreground">
                        {derived.layoff_pass ? "✓ 12+ months recommended" : "✗ Less than 12 months"}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How long your available cash would cover mortgage payments if you lost income</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>

          <TabsContent value="loan" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Home className="h-4 w-4 mr-1" />
                  <span>Home Price</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(inputs.h_price)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Loan Amount</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(derived.loan)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Percent className="h-4 w-4 mr-1" />
                  <span>Interest Rate</span>
                </div>
                <div className="text-xl font-bold">{formatPercent(inputs.i_yr)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Loan Term</span>
                </div>
                <div className="text-xl font-bold">{inputs.t_yrs} years</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Percent className="h-4 w-4 mr-1" />
                  <span>Down Payment</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(derived.down_pmt)}</div>
                <div className="text-xs text-muted-foreground">{formatPercent(inputs.dp_pct)} of purchase price</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Percent className="h-4 w-4 mr-1" />
                  <span>Loan-to-Value</span>
                </div>
                <div className="text-xl font-bold">{formatPercent(1 - inputs.dp_pct)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Down Payment</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.down_pmt)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Initial payment toward home purchase ({formatPercent(inputs.dp_pct)} of purchase price)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Closing Costs</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.clos_cost)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercent(inputs.cc_pct)} of purchase price
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fees paid at closing including loan origination, appraisal, title insurance, etc.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Required Reserves</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(derived.reserves)}</div>
                      <div className="text-xs text-muted-foreground">{inputs.res_mo} months of PITI</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cash reserves required by lender to cover mortgage payments in case of emergency</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm font-medium">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Total Cash Needed</span>
                </div>
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  {formatCurrency(derived.total_cash_needed)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Available Cash</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(inputs.cash_avail)}</div>
              </div>

              <div className={`p-4 rounded-lg ${derived.cash_pass ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Cash Shortfall/Surplus</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(inputs.cash_avail - derived.total_cash_needed)}</div>
                <div className="text-xs text-muted-foreground">
                  {derived.cash_pass ? "✓ Sufficient cash" : "✗ Cash shortfall"}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="networth" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <PieChart className="h-4 w-4 mr-1" />
                  <span>Total Assets</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(inputs.total_assets)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <PieChart className="h-4 w-4 mr-1" />
                  <span>Total Liabilities</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(inputs.total_liabilities)}</div>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <PieChart className="h-4 w-4 mr-1" />
                  <span>Net Worth</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(derived.net_worth)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Home className="h-4 w-4 mr-1" />
                  <span>Home Equity (Down Payment)</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(derived.home_equity)}</div>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center text-sm font-medium">
                  <PieChart className="h-4 w-4 mr-1" />
                  <span>Net Worth Tied Up in Home</span>
                </div>
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  {formatPercent(derived.equity_pct_of_nw)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <div className="font-medium text-green-600">Conservative</div>
                    <div>≤ 30%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-600">Moderate</div>
                    <div>≤ 50%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-orange-600">Aggressive</div>
                    <div>≤ 65%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Net Worth Analysis</h4>
              <p className="text-sm text-muted-foreground mb-2">
                This shows what percentage of your total net worth would be tied up in home equity (your down payment).
                Keeping this percentage reasonable helps maintain financial flexibility.
              </p>
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span>Your scenario:</span>
                  <span className={
                    derived.equity_pct_of_nw <= 0.30 ? "text-green-600 font-medium" :
                      derived.equity_pct_of_nw <= 0.50 ? "text-blue-600 font-medium" :
                        derived.equity_pct_of_nw <= 0.65 ? "text-orange-600 font-medium" :
                          "text-red-600 font-medium"
                  }>
                    {derived.equity_pct_of_nw <= 0.30 ? "Conservative" :
                      derived.equity_pct_of_nw <= 0.50 ? "Moderate" :
                        derived.equity_pct_of_nw <= 0.65 ? "Aggressive" :
                          "High Risk"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
