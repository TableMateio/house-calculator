// @ts-nocheck
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, TrendingUp, Target } from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function EnhancedScenarioPlanner({
    inputs,
    derived,
    thresholds,
    formatCurrency,
    formatPercent,
    handleInputChange,
}) {
    const [scenarios, setScenarios] = useState([])
    const [selectedScenario, setSelectedScenario] = useState(null)
    const [targetMode, setTargetMode] = useState("targetSavings") // targetSavings, targetHouse, maxAffordability

    // Generate scenarios based on target mode
    useEffect(() => {
        generateScenarios()
    }, [inputs, derived, targetMode])

    const generateScenarios = () => {
        if (targetMode === "targetSavings") {
            // Generate scenarios that leave different amounts of cash remaining
            const targetRemainingAmounts = [25000, 50000, 75000, 100000, 150000]

            const newScenarios = targetRemainingAmounts.map(targetRemaining => {
                const maxCashForHouse = inputs.cash_avail - targetRemaining
                if (maxCashForHouse <= 0) return null

                // Work backwards from available cash to find max house price
                const result = calculateMaxHousePriceFromCash(maxCashForHouse)
                return {
                    id: `savings-${targetRemaining}`,
                    name: `Keep ${formatCurrency(targetRemaining)}`,
                    targetRemaining,
                    ...result
                }
            }).filter(Boolean)

            setScenarios(newScenarios)
        } else if (targetMode === "targetHouse") {
            // Generate scenarios with different down payment amounts for target house price
            const targetPrice = inputs.target_house_price || inputs.h_price
            const dpPercentages = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]

            const newScenarios = dpPercentages.map(dpPct => {
                const result = calculateScenarioForHouse(targetPrice, dpPct)
                return {
                    id: `house-${dpPct}`,
                    name: `${formatPercent(dpPct)} down`,
                    dpPct,
                    targetPrice,
                    ...result
                }
            })

            setScenarios(newScenarios)
        } else if (targetMode === "maxAffordability") {
            // Generate max affordable house prices at different DTI levels
            const dtiTargets = [0.28, 0.33, 0.36, 0.40, 0.43]

            const newScenarios = dtiTargets.map(dtiTarget => {
                const result = calculateMaxHousePriceFromDTI(dtiTarget)
                return {
                    id: `dti-${dtiTarget}`,
                    name: `${formatPercent(dtiTarget)} DTI`,
                    dtiTarget,
                    ...result
                }
            })

            setScenarios(newScenarios)
        }
    }

    // Calculate max house price working backwards from available cash
    const calculateMaxHousePriceFromCash = (availableCash) => {
        // Use iterative approach to find max house price
        let minPrice = 100000
        let maxPrice = 2000000
        let bestPrice = 0

        for (let i = 0; i < 20; i++) { // 20 iterations should be enough for convergence
            const testPrice = (minPrice + maxPrice) / 2
            const testResult = calculateScenarioForHouse(testPrice, inputs.dp_pct)

            if (testResult.totalCashNeeded <= availableCash) {
                bestPrice = testPrice
                minPrice = testPrice
            } else {
                maxPrice = testPrice
            }

            if (maxPrice - minPrice < 1000) break // Close enough
        }

        return calculateScenarioForHouse(bestPrice, inputs.dp_pct)
    }

    // Calculate max house price from DTI target
    const calculateMaxHousePriceFromDTI = (dtiTarget) => {
        const gmi = derived.gmi
        const monthlyDebt = inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12
        const maxPiti = gmi * dtiTarget - monthlyDebt

        if (maxPiti <= 0) return { homePrice: 0, valid: false }

        // Use iterative approach
        let minPrice = 100000
        let maxPrice = 2000000
        let bestPrice = 0

        for (let i = 0; i < 20; i++) {
            const testPrice = (minPrice + maxPrice) / 2
            const testPiti = calculatePITI(testPrice, inputs.dp_pct)

            if (testPiti <= maxPiti) {
                bestPrice = testPrice
                minPrice = testPrice
            } else {
                maxPrice = testPrice
            }

            if (maxPrice - minPrice < 1000) break
        }

        return calculateScenarioForHouse(bestPrice, inputs.dp_pct)
    }

    // Calculate scenario details for a specific house price and down payment
    const calculateScenarioForHouse = (homePrice, dpPct) => {
        const loan = homePrice * (1 - dpPct)
        const downPayment = homePrice * dpPct
        const closingCosts = homePrice * inputs.cc_pct
        const piti = calculatePITI(homePrice, dpPct)
        const reserves = piti * inputs.res_mo
        const totalCashNeeded = downPayment + closingCosts + reserves
        const cashRemaining = inputs.cash_avail - totalCashNeeded

        const frontEnd = piti / derived.gmi
        const backEnd = (piti + (inputs.isMonthlyDebt ? inputs.omd : inputs.omd / 12)) / derived.gmi

        // Calculate net worth impact
        const netWorth = inputs.total_assets - inputs.total_liabilities
        const equityPctOfNW = netWorth > 0 ? downPayment / netWorth : 0

        return {
            homePrice,
            dpPct,
            loan,
            downPayment,
            piti,
            totalCashNeeded,
            cashRemaining,
            frontEnd,
            backEnd,
            equityPctOfNW,
            cashPass: totalCashNeeded <= inputs.cash_avail,
            dtiPass: frontEnd <= thresholds.moderate.front_end && backEnd <= thresholds.moderate.back_end,
            netWorthPass: equityPctOfNW <= thresholds.moderate.net_worth,
            valid: true
        }
    }

    // Helper function to calculate PITI
    const calculatePITI = (homePrice, dpPct) => {
        const loan = homePrice * (1 - dpPct)
        const r = inputs.i_yr / 12
        const n = inputs.t_yrs * 12

        const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        const tax = (homePrice * inputs.pt_rate) / 12
        const ins = (homePrice * inputs.hi_rate) / 12
        const pmi = dpPct < 0.2 ? (loan * inputs.pmi_rate) / 12 : 0

        return pi + tax + ins + pmi
    }

    // Apply selected scenario
    const applyScenario = () => {
        if (!selectedScenario) return

        handleInputChange("h_price", selectedScenario.homePrice)
        handleInputChange("dp_pct", selectedScenario.dpPct)

        if (targetMode === "targetHouse") {
            handleInputChange("target_house_price", selectedScenario.targetPrice)
        }

        // Switch back to standard mode
        handleInputChange("calculationMode", "standard")
    }

    const getScenarioStatus = (scenario) => {
        if (!scenario.valid) return { pass: false, color: "text-gray-400" }

        const overallPass = scenario.cashPass && scenario.dtiPass
        return {
            pass: overallPass,
            color: overallPass ? "text-green-600" : "text-red-600"
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Enhanced Scenario Planner
                </CardTitle>
                <CardDescription>
                    Explore different scenarios based on your priorities and constraints
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Target Mode Selection */}
                <div className="space-y-2">
                    <Label>Planning Mode</Label>
                    <Select value={targetMode} onValueChange={setTargetMode}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select planning mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="targetSavings">Target Savings Remaining</SelectItem>
                            <SelectItem value="targetHouse">Target House Price</SelectItem>
                            <SelectItem value="maxAffordability">Maximum Affordability</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        {targetMode === "targetSavings" && "Find house prices that leave you with specific cash amounts"}
                        {targetMode === "targetHouse" && "Explore down payment options for a specific house price"}
                        {targetMode === "maxAffordability" && "See maximum house prices at different debt-to-income ratios"}
                    </p>
                </div>

                {/* Target House Price Input for targetHouse mode */}
                {targetMode === "targetHouse" && (
                    <div className="space-y-2">
                        <Label htmlFor="target_house_price">Target House Price</Label>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                                id="target_house_price"
                                type="number"
                                value={inputs.target_house_price}
                                onChange={(e) => handleInputChange("target_house_price", Number(e.target.value))}
                            />
                        </div>
                    </div>
                )}

                {/* Scenarios Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Scenario</TableHead>
                            <TableHead>House Price</TableHead>
                            <TableHead>Down Payment</TableHead>
                            <TableHead>Monthly Payment</TableHead>
                            <TableHead>Cash Needed</TableHead>
                            <TableHead>Cash Remaining</TableHead>
                            <TableHead>DTI</TableHead>
                            <TableHead>Net Worth %</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {scenarios.map((scenario, index) => {
                            const status = getScenarioStatus(scenario)

                            return (
                                <TableRow
                                    key={scenario.id}
                                    className={selectedScenario === scenario ? "bg-muted/50" : ""}
                                >
                                    <TableCell className="font-medium">{scenario.name}</TableCell>
                                    <TableCell>{formatCurrency(scenario.homePrice)}</TableCell>
                                    <TableCell>
                                        {formatCurrency(scenario.downPayment)}
                                        <div className="text-xs text-muted-foreground">
                                            {formatPercent(scenario.dpPct)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(scenario.piti)}</TableCell>
                                    <TableCell className={scenario.cashPass ? "text-green-600" : "text-red-600"}>
                                        {formatCurrency(scenario.totalCashNeeded)}
                                    </TableCell>
                                    <TableCell className={scenario.cashRemaining >= 0 ? "text-green-600" : "text-red-600"}>
                                        {formatCurrency(scenario.cashRemaining)}
                                    </TableCell>
                                    <TableCell className={scenario.dtiPass ? "text-green-600" : "text-red-600"}>
                                        {formatPercent(scenario.backEnd)}
                                    </TableCell>
                                    <TableCell className={scenario.netWorthPass ? "text-green-600" : "text-orange-600"}>
                                        {formatPercent(scenario.equityPctOfNW)}
                                    </TableCell>
                                    <TableCell>
                                        {status.pass ? (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                <span>Viable</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-red-600">
                                                <XCircle className="h-4 w-4 mr-1" />
                                                <span>Issues</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant={selectedScenario === scenario ? "default" : "outline"}
                                            onClick={() => setSelectedScenario(scenario)}
                                            disabled={!scenario.valid}
                                        >
                                            Select
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

                {/* Selected Scenario Details */}
                {selectedScenario && (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-medium mb-3">Selected Scenario: {selectedScenario.name}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">House Price</p>
                                    <p className="text-lg font-medium">{formatCurrency(selectedScenario.homePrice)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Payment</p>
                                    <p className="text-lg font-medium">{formatCurrency(selectedScenario.piti)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Cash Remaining</p>
                                    <p className={`text-lg font-medium ${selectedScenario.cashRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(selectedScenario.cashRemaining)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Net Worth Impact</p>
                                    <p className="text-lg font-medium">{formatPercent(selectedScenario.equityPctOfNW)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={applyScenario}>Apply This Scenario</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 