"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"

export default function AffordabilityCalculator({
  inputs,
  derived,
  thresholds,
  formatCurrency,
  formatPercent,
  handleInputChange,
}) {
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  // Calculate options based on the selected mode and target variable
  useEffect(() => {
    if (inputs.calculationMode === "maxPrice") {
      // Just show the max prices for each scenario
      const scenarios = ["conservative", "moderate", "aggressive"]
      const newOptions = scenarios.map((scenario) => {
        const maxPrice = calculateMaxHomePrice(scenario)
        return {
          scenario,
          value: maxPrice,
          downPayment: maxPrice * inputs.dp_pct,
          loan: maxPrice * (1 - inputs.dp_pct),
          piti: calculatePITI(maxPrice, inputs.dp_pct),
          frontEnd: thresholds[scenario].front_end,
          backEnd: thresholds[scenario].back_end,
          cashNeeded: calculateCashNeeded(maxPrice, inputs.dp_pct),
          cashPass: calculateCashNeeded(maxPrice, inputs.dp_pct) <= inputs.cash_avail,
        }
      })
      setOptions(newOptions)
      setSelectedOption(newOptions[1]) // Default to moderate
    } else if (inputs.calculationMode === "downPaymentOptions") {
      if (inputs.targetVariable === "h_price") {
        // Generate different home prices with the same down payment amount
        const downPaymentAmount = inputs.h_price * inputs.dp_pct
        const dpOptions = [0.03, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]

        const newOptions = dpOptions.map((dpPct) => {
          const homePrice = downPaymentAmount / dpPct
          return {
            dpPct,
            value: homePrice,
            downPayment: downPaymentAmount,
            loan: homePrice - downPaymentAmount,
            piti: calculatePITI(homePrice, dpPct),
            frontEnd: calculatePITI(homePrice, dpPct) / derived.gmi,
            backEnd:
              (calculatePITI(homePrice, dpPct) + (inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12)) / derived.gmi,
            cashNeeded: calculateCashNeeded(homePrice, dpPct),
            cashPass: calculateCashNeeded(homePrice, dpPct) <= inputs.cash_avail,
          }
        })
        setOptions(newOptions)
        // Find the option closest to current dp_pct
        const closestOption = newOptions.reduce((prev, curr) =>
          Math.abs(curr.dpPct - inputs.dp_pct) < Math.abs(prev.dpPct - inputs.dp_pct) ? curr : prev,
        )
        setSelectedOption(closestOption)
      } else {
        // Generate different down payment percentages for the same home price
        const dpOptions = [0.03, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]

        const newOptions = dpOptions.map((dpPct) => {
          return {
            dpPct,
            value: dpPct,
            homePrice: inputs.h_price,
            downPayment: inputs.h_price * dpPct,
            loan: inputs.h_price * (1 - dpPct),
            piti: calculatePITI(inputs.h_price, dpPct),
            frontEnd: calculatePITI(inputs.h_price, dpPct) / derived.gmi,
            backEnd:
              (calculatePITI(inputs.h_price, dpPct) + (inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12)) /
              derived.gmi,
            cashNeeded: calculateCashNeeded(inputs.h_price, dpPct),
            cashPass: calculateCashNeeded(inputs.h_price, dpPct) <= inputs.cash_avail,
          }
        })
        setOptions(newOptions)
        // Find the option closest to current dp_pct
        const closestOption = newOptions.reduce((prev, curr) =>
          Math.abs(curr.dpPct - inputs.dp_pct) < Math.abs(prev.dpPct - inputs.dp_pct) ? curr : prev,
        )
        setSelectedOption(closestOption)
      }
    }
  }, [inputs, derived.gmi])

  // Helper function to calculate max home price for a scenario
  const calculateMaxHomePrice = (scenario) => {
    const gmi = derived.gmi // Use the already calculated monthly income
    const maxFrontEndRatio = thresholds[scenario].front_end
    const maxBackEndRatio = thresholds[scenario].back_end

    // Calculate max PITI based on front-end ratio
    const maxPitiFrontEnd = gmi * maxFrontEndRatio

    // Calculate max PITI based on back-end ratio
    const monthlyDebt = inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12
    const maxPitiBackEnd = gmi * maxBackEndRatio - monthlyDebt

    // Use the lower of the two
    const maxPiti = Math.min(maxPitiFrontEnd, maxPitiBackEnd)

    // Monthly rate and number of payments
    const r = inputs.i_yr / 12
    const n = inputs.t_yrs * 12

    // Payment factor
    const paymentFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

    // Estimate tax and insurance as percentage of price
    const taxInsPct = (inputs.pt_rate + inputs.hi_rate) / 12

    // PMI factor
    const pmiPct = inputs.dp_pct < 0.2 ? inputs.pmi_rate / 12 : 0

    // Solve for max loan amount
    const combinedFactor = paymentFactor + taxInsPct / (1 - inputs.dp_pct) + pmiPct * (1 - inputs.dp_pct)
    const maxLoan = maxPiti / combinedFactor

    // Convert to max price
    const maxPrice = maxLoan / (1 - inputs.dp_pct)

    return maxPrice
  }

  // Helper function to calculate PITI for a given home price and down payment percentage
  const calculatePITI = (homePrice, dpPct) => {
    const loan = homePrice * (1 - dpPct)
    const r = inputs.i_yr / 12
    const n = inputs.t_yrs * 12

    // Principal and interest
    const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

    // Tax and insurance
    const tax = (homePrice * inputs.pt_rate) / 12
    const ins = (homePrice * inputs.hi_rate) / 12

    // PMI
    const pmi = dpPct < 0.2 ? (loan * inputs.pmi_rate) / 12 : 0

    return pi + tax + ins + pmi
  }

  // Helper function to calculate total cash needed
  const calculateCashNeeded = (homePrice, dpPct) => {
    const downPayment = homePrice * dpPct
    const closingCosts = homePrice * inputs.cc_pct
    const piti = calculatePITI(homePrice, dpPct)
    const reserves = piti * inputs.res_mo

    return downPayment + closingCosts + reserves
  }

  // Apply the selected option
  const applyOption = () => {
    if (!selectedOption) return

    if (inputs.calculationMode === "maxPrice") {
      handleInputChange("h_price", selectedOption.value)
    } else if (inputs.calculationMode === "downPaymentOptions") {
      if (inputs.targetVariable === "h_price") {
        handleInputChange("h_price", selectedOption.value)
        handleInputChange("dp_pct", selectedOption.dpPct)
      } else {
        handleInputChange("dp_pct", selectedOption.value)
      }
    }

    // Switch back to standard mode
    handleInputChange("calculationMode", "standard")
  }

  // Get scenario for a specific ratio
  const getScenarioForRatio = (ratio, type) => {
    if (ratio <= thresholds.conservative[type]) return "conservative"
    if (ratio <= thresholds.moderate[type]) return "moderate"
    if (ratio <= thresholds.aggressive[type]) return "aggressive"
    return "exceeds all"
  }

  // Check if an option passes approval
  const getApprovalStatus = (option) => {
    const frontEndScenario = getScenarioForRatio(option.frontEnd, "front_end")
    const backEndScenario = getScenarioForRatio(option.backEnd, "back_end")
    return {
      frontEndPass: frontEndScenario !== "exceeds all",
      backEndPass: backEndScenario !== "exceeds all",
      overallPass: frontEndScenario !== "exceeds all" && backEndScenario !== "exceeds all" && option.cashPass,
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {inputs.calculationMode === "maxPrice"
              ? "Maximum Home Price Calculator"
              : inputs.targetVariable === "h_price"
                ? "Home Price Options"
                : "Down Payment Options"}
          </CardTitle>
          <CardDescription>
            {inputs.calculationMode === "maxPrice"
              ? "See the maximum home price you can afford based on different approval scenarios"
              : inputs.targetVariable === "h_price"
                ? "See different home prices you could afford with the same down payment amount"
                : "See different down payment options for your target home price"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {inputs.calculationMode === "maxPrice"
                    ? "Scenario"
                    : inputs.targetVariable === "h_price"
                      ? "Down Payment %"
                      : "Down Payment %"}
                </TableHead>
                <TableHead>
                  {inputs.calculationMode === "maxPrice"
                    ? "Max Home Price"
                    : inputs.targetVariable === "h_price"
                      ? "Home Price"
                      : "Down Payment Amount"}
                </TableHead>
                <TableHead>Monthly Payment</TableHead>
                <TableHead>DTI Ratios</TableHead>
                <TableHead>Cash Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option, index) => {
                const status = getApprovalStatus(option)

                return (
                  <TableRow key={index} className={selectedOption === option ? "bg-muted/50" : ""}>
                    <TableCell>
                      {inputs.calculationMode === "maxPrice"
                        ? option.scenario === "conservative"
                          ? "Conservative (28/36%)"
                          : option.scenario === "moderate"
                            ? "Moderate (33/43%)"
                            : "Aggressive (40/45%)"
                        : formatPercent(option.dpPct)}
                    </TableCell>
                    <TableCell>
                      {inputs.calculationMode === "maxPrice" || inputs.targetVariable === "h_price"
                        ? formatCurrency(option.value)
                        : formatCurrency(option.downPayment)}
                    </TableCell>
                    <TableCell>{formatCurrency(option.piti)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={status.frontEndPass ? "text-green-600" : "text-red-600"}>
                          Front: {formatPercent(option.frontEnd)}
                        </span>
                        <span className={status.backEndPass ? "text-green-600" : "text-red-600"}>
                          Back: {formatPercent(option.backEnd)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={option.cashPass ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(option.cashNeeded)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {status.overallPass ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>Approved</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span>Denied</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={selectedOption === option ? "default" : "outline"}
                        onClick={() => setSelectedOption(option)}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {selectedOption && (
            <div className="mt-6 space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Selected Option Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {inputs.calculationMode === "maxPrice"
                        ? "Home Price"
                        : inputs.targetVariable === "h_price"
                          ? "Home Price"
                          : "Down Payment"}
                    </p>
                    <p className="text-lg font-medium">
                      {inputs.calculationMode === "maxPrice" || inputs.targetVariable === "h_price"
                        ? formatCurrency(selectedOption.value)
                        : formatPercent(selectedOption.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Payment</p>
                    <p className="text-lg font-medium">{formatCurrency(selectedOption.piti)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cash Required</p>
                    <p className="text-lg font-medium">{formatCurrency(selectedOption.cashNeeded)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={applyOption}>Apply This Option</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
