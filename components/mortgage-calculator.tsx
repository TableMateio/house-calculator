// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ResultsPanel from "./results-panel"
import ScenarioComparison from "./scenario-comparison"
import AffordabilityCalculator from "./affordability-calculator"
import KeyMetricsDashboard from "./key-metrics-dashboard"
import EnhancedScenarioPlanner from "./enhanced-scenario-planner"

export default function MortgageCalculator() {
  // Default input values
  const [inputs, setInputs] = useState({
    n_inc: 170000,
    s_inc: 80000,
    omd: 500,
    h_price: 750000,
    dp_pct: 0.2,
    i_yr: 0.0675,
    t_yrs: 30,
    pt_rate: 0.0125,
    hi_rate: 0.004,
    pmi_rate: 0.01,
    cc_pct: 0.04,
    res_mo: 6,
    cash_avail: 200000,
    // Net worth inputs
    total_assets: 400000,
    total_liabilities: 50000,
    isAnnualIncome: true,
    isMonthlyDebt: true,
    calculationMode: "standard", // standard, maxPrice, downPaymentOptions, targetSavings, targetHouse
    targetVariable: "h_price", // h_price, dp_pct, cash_remaining, savings_target
    // New scenario targets
    target_cash_remaining: 50000,
    target_house_price: 750000,
  })

  // Derived values
  const [derived, setDerived] = useState({
    gmi: 0,
    loan: 0,
    r: 0,
    n: 0,
    pi: 0,
    tax: 0,
    ins: 0,
    pmi: 0,
    piti: 0,
    front_end: 0,
    back_end: 0,
    down_pmt: 0,
    clos_cost: 0,
    reserves: 0,
    total_cash_needed: 0,
    cash_pass: false,
    cash_remaining: 0,
    layoff_cash_months: 0,
    layoff_pass: false,
    // Net worth analysis
    net_worth: 0,
    home_equity: 0,
    equity_pct_of_nw: 0,
    net_worth_scenario: 'conservative',
  })

  // Approval thresholds
  const thresholds = {
    conservative: { front_end: 0.28, back_end: 0.36, net_worth: 0.30 },
    moderate: { front_end: 0.33, back_end: 0.43, net_worth: 0.50 },
    aggressive: { front_end: 0.4, back_end: 0.45, net_worth: 0.65 },
  }

  // Calculate all derived values when inputs change
  useEffect(() => {
    calculateDerivedValues()
  }, [inputs])

  const calculateDerivedValues = () => {
    // Monthly income - handle annual/monthly toggle
    const gmi = inputs.isAnnualIncome ? (inputs.n_inc + inputs.s_inc) / 12 : inputs.n_inc + inputs.s_inc

    // Monthly debt - handle monthly/annual toggle
    const monthlyDebt = inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12

    // Loan amount
    const loan = inputs.h_price * (1 - inputs.dp_pct)

    // Monthly rate and number of payments
    const r = inputs.i_yr / 12
    const n = inputs.t_yrs * 12

    // Principal and interest payment
    const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

    // Monthly add-ons
    const tax = (inputs.h_price * inputs.pt_rate) / 12
    const ins = (inputs.h_price * inputs.hi_rate) / 12
    const pmi = inputs.dp_pct < 0.2 ? (loan * inputs.pmi_rate) / 12 : 0

    // Full housing payment
    const piti = pi + tax + ins + pmi

    // Debt-to-Income ratios
    const front_end = piti / gmi
    const back_end = (piti + monthlyDebt) / gmi

    // Cash requirements
    const down_pmt = inputs.h_price * inputs.dp_pct
    const clos_cost = inputs.h_price * inputs.cc_pct
    const reserves = piti * inputs.res_mo
    const total_cash_needed = down_pmt + clos_cost + reserves

    // Cash test
    const cash_pass = total_cash_needed <= inputs.cash_avail

    // Layoff test
    const layoff_cash_months = inputs.cash_avail / piti
    const layoff_pass = layoff_cash_months >= 12

    // Net worth analysis
    const net_worth = inputs.total_assets - inputs.total_liabilities
    const home_equity = down_pmt // Initial equity is the down payment
    const equity_pct_of_nw = net_worth > 0 ? home_equity / net_worth : 0

    setDerived({
      gmi,
      loan,
      r,
      n,
      pi,
      tax,
      ins,
      pmi,
      piti,
      front_end,
      back_end,
      down_pmt,
      clos_cost,
      reserves,
      total_cash_needed,
      cash_pass,
      cash_remaining: inputs.cash_avail - total_cash_needed,
      layoff_cash_months,
      layoff_pass,
      net_worth,
      home_equity,
      equity_pct_of_nw,
      net_worth_scenario: getScenarioForRatio(equity_pct_of_nw, "net_worth"),
    })
  }

  const handleInputChange = (name, value) => {
    setInputs((prev) => ({ ...prev, [name]: value }))
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Get scenario for a specific ratio
  const getScenarioForRatio = (ratio, type) => {
    if (ratio <= thresholds.conservative[type]) return "conservative"
    if (ratio <= thresholds.moderate[type]) return "moderate"
    if (ratio <= thresholds.aggressive[type]) return "aggressive"
    return "exceeds all"
  }

  // Check if the current scenario passes
  const frontEndScenario = getScenarioForRatio(derived.front_end, "front_end")
  const backEndScenario = getScenarioForRatio(derived.back_end, "back_end")
  const frontEndPass = frontEndScenario !== "exceeds all"
  const backEndPass = backEndScenario !== "exceeds all"
  const overallPass = frontEndPass && backEndPass && derived.cash_pass

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Adjust your home buying parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Calculation Mode</Label>
              <Select
                value={inputs.calculationMode}
                onValueChange={(value) => handleInputChange("calculationMode", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calculation mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Calculator</SelectItem>
                  <SelectItem value="maxPrice">Max Home Price Calculator</SelectItem>
                  <SelectItem value="downPaymentOptions">Down Payment Options</SelectItem>
                  <SelectItem value="targetSavings">Target Savings Calculator</SelectItem>
                  <SelectItem value="targetHouse">Target House Calculator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose how you want to use the calculator</p>
            </div>

            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="property">Property</TabsTrigger>
                <TabsTrigger value="loan">Loan</TabsTrigger>
                <TabsTrigger value="cash">Cash</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Income Type</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="income-type" className={!inputs.isAnnualIncome ? "font-bold" : ""}>
                      Monthly
                    </Label>
                    <Switch
                      id="income-type"
                      checked={inputs.isAnnualIncome}
                      onCheckedChange={(checked) => handleInputChange("isAnnualIncome", checked)}
                    />
                    <Label htmlFor="income-type" className={inputs.isAnnualIncome ? "font-bold" : ""}>
                      Annual
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="n_inc">Your {inputs.isAnnualIncome ? "Annual" : "Monthly"} Income</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="n_inc"
                      type="number"
                      value={inputs.n_inc}
                      onChange={(e) => handleInputChange("n_inc", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="s_inc">Partner's {inputs.isAnnualIncome ? "Annual" : "Monthly"} Income</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="s_inc"
                      type="number"
                      value={inputs.s_inc}
                      onChange={(e) => handleInputChange("s_inc", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <Label>Debt Type</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="debt-type" className={!inputs.isMonthlyDebt ? "font-bold" : ""}>
                      Annual
                    </Label>
                    <Switch
                      id="debt-type"
                      checked={inputs.isMonthlyDebt}
                      onCheckedChange={(checked) => handleInputChange("isMonthlyDebt", checked)}
                    />
                    <Label htmlFor="debt-type" className={inputs.isMonthlyDebt ? "font-bold" : ""}>
                      Monthly
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="omd">{inputs.isMonthlyDebt ? "Monthly" : "Annual"} Debt Payments</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="omd"
                      type="number"
                      value={inputs.omd}
                      onChange={(e) => handleInputChange("omd", Number(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include all required {inputs.isMonthlyDebt ? "monthly" : "annual"} debt payments (loans, credit
                    cards, student loans)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="property" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="h_price">Home Price</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="h_price"
                      type="number"
                      value={inputs.h_price}
                      onChange={(e) => handleInputChange("h_price", Number(e.target.value))}
                      disabled={
                        inputs.calculationMode === "maxPrice" ||
                        (inputs.calculationMode === "downPaymentOptions" && inputs.targetVariable === "h_price")
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pt_rate">Property Tax Rate (%)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="pt_rate"
                      type="number"
                      step="0.001"
                      value={inputs.pt_rate * 100}
                      onChange={(e) => handleInputChange("pt_rate", Number(e.target.value) / 100)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hi_rate">Home Insurance + HOA Rate (%)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="hi_rate"
                      type="number"
                      step="0.001"
                      value={inputs.hi_rate * 100}
                      onChange={(e) => handleInputChange("hi_rate", Number(e.target.value) / 100)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="loan" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dp_pct">Down Payment (%)</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      id="dp_pct"
                      min={3}
                      max={50}
                      step={1}
                      value={[inputs.dp_pct * 100]}
                      onValueChange={(value) => handleInputChange("dp_pct", value[0] / 100)}
                      className="flex-1"
                      disabled={inputs.calculationMode === "downPaymentOptions" && inputs.targetVariable === "dp_pct"}
                    />
                    <span className="w-12 text-right">{(inputs.dp_pct * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(inputs.h_price * inputs.dp_pct)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="i_yr">Interest Rate (%)</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      id="i_yr"
                      min={2}
                      max={10}
                      step={0.125}
                      value={[inputs.i_yr * 100]}
                      onValueChange={(value) => handleInputChange("i_yr", value[0] / 100)}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">{(inputs.i_yr * 100).toFixed(3)}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t_yrs">Loan Term (Years)</Label>
                  <Select
                    value={inputs.t_yrs.toString()}
                    onValueChange={(value) => handleInputChange("t_yrs", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 years</SelectItem>
                      <SelectItem value="20">20 years</SelectItem>
                      <SelectItem value="30">30 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pmi_rate">PMI Rate (%)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="pmi_rate"
                      type="number"
                      step="0.001"
                      value={inputs.pmi_rate * 100}
                      onChange={(e) => handleInputChange("pmi_rate", Number(e.target.value) / 100)}
                      disabled={inputs.dp_pct >= 0.2}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {inputs.dp_pct >= 0.2 && (
                    <p className="text-xs text-muted-foreground">No PMI required with 20% or more down payment</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="cash" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_avail">Available Cash</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="cash_avail"
                      type="number"
                      value={inputs.cash_avail}
                      onChange={(e) => handleInputChange("cash_avail", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc_pct">Closing Costs (%)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="cc_pct"
                      type="number"
                      step="0.01"
                      value={inputs.cc_pct * 100}
                      onChange={(e) => handleInputChange("cc_pct", Number(e.target.value) / 100)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="res_mo">Required Reserves (Months)</Label>
                  <Select
                    value={inputs.res_mo.toString()}
                    onValueChange={(value) => handleInputChange("res_mo", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 months</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Net Worth Analysis</Label>
                    <p className="text-xs text-muted-foreground">
                      Optional: Analyze what percentage of your net worth would be tied up in home equity
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_assets">Total Assets</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id="total_assets"
                        type="number"
                        value={inputs.total_assets}
                        onChange={(e) => handleInputChange("total_assets", Number(e.target.value))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cash, investments, retirement accounts, real estate, etc.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_liabilities">Total Liabilities</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id="total_liabilities"
                        type="number"
                        value={inputs.total_liabilities}
                        onChange={(e) => handleInputChange("total_liabilities", Number(e.target.value))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Credit cards, student loans, auto loans, other mortgages, etc.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {inputs.calculationMode !== "standard" && (
              <>
                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label>Target Variable</Label>
                  <Select
                    value={inputs.targetVariable}
                    onValueChange={(value) => handleInputChange("targetVariable", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {inputs.calculationMode === "maxPrice" ? (
                        <>
                          <SelectItem value="h_price">Home Price</SelectItem>
                        </>
                      ) : inputs.calculationMode === "targetSavings" || inputs.calculationMode === "targetHouse" ? (
                        <>
                          <SelectItem value="h_price">Home Price</SelectItem>
                          <SelectItem value="dp_pct">Down Payment</SelectItem>
                          <SelectItem value="cash_remaining">Cash Remaining</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="h_price">Home Price</SelectItem>
                          <SelectItem value="dp_pct">Down Payment</SelectItem>
                          <SelectItem value="cash_remaining">Cash Remaining</SelectItem>
                          <SelectItem value="savings_target">Savings Target</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which variable you want to calculate options for
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-6">
          {inputs.calculationMode === "standard" ? (
            <>
              <KeyMetricsDashboard
                derived={derived}
                inputs={inputs}
                thresholds={thresholds}
                formatCurrency={formatCurrency}
                formatPercent={formatPercent}
              />

              <ResultsPanel
                derived={derived}
                inputs={inputs}
                formatCurrency={formatCurrency}
                formatPercent={formatPercent}
              />

              <ScenarioComparison
                inputs={inputs}
                derived={derived}
                thresholds={thresholds}
                formatPercent={formatPercent}
                formatCurrency={formatCurrency}
              />
            </>
          ) : inputs.calculationMode === "targetSavings" || inputs.calculationMode === "targetHouse" ? (
            <EnhancedScenarioPlanner
              inputs={inputs}
              derived={derived}
              thresholds={thresholds}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
              handleInputChange={handleInputChange}
            />
          ) : (
            <AffordabilityCalculator
              inputs={inputs}
              derived={derived}
              thresholds={thresholds}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
              handleInputChange={handleInputChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
