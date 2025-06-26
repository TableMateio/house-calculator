"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
    Target,
    Lock,
    Unlock,
    Home,
    DollarSign,
    Percent,
    Calendar,
    TrendingUp,
    PieChart,
    Clock,
    Calculator
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function DynamicCalculator() {
    // Variable definitions with their properties
    const [variables, setVariables] = useState({
        h_price: { value: 750000, locked: false, label: "Home Price", icon: Home, format: "currency", description: "Target purchase price" },
        dp_pct: { value: 0.2, locked: false, label: "Down Payment %", icon: Percent, format: "percent", description: "Percent of price paid upfront" },
        piti: { value: 0, locked: false, label: "Monthly Payment", icon: DollarSign, format: "currency", description: "Total housing payment (PITI)" },
        cash_remaining: { value: 0, locked: false, label: "Cash Remaining", icon: DollarSign, format: "currency", description: "Cash left after purchase" },
        i_yr: { value: 0.0675, locked: false, label: "Interest Rate", icon: Percent, format: "percent", description: "Annual mortgage rate" },
        t_yrs: { value: 30, locked: false, label: "Loan Term", icon: Calendar, format: "years", description: "Mortgage term length" },
        n_inc: { value: 170000, locked: false, label: "Nicole's Income", icon: DollarSign, format: "currency", description: "Annual gross income" },
        s_inc: { value: 80000, locked: false, label: "Scott's Income", icon: DollarSign, format: "currency", description: "Annual gross income" },
        omd: { value: 500, locked: false, label: "Other Monthly Debt", icon: DollarSign, format: "currency", description: "Credit cards, loans, etc." },
        cash_avail: { value: 200000, locked: false, label: "Available Cash", icon: DollarSign, format: "currency", description: "Liquid cash for purchase" },
        total_assets: { value: 400000, locked: false, label: "Total Assets", icon: PieChart, format: "currency", description: "All investments, cash, property" },
        total_liabilities: { value: 50000, locked: false, label: "Total Liabilities", icon: PieChart, format: "currency", description: "All debts and obligations" },
    })

    // Fixed parameters (rates and percentages that typically don't change)
    const [parameters, setParameters] = useState({
        pt_rate: 0.0125,
        hi_rate: 0.004,
        pmi_rate: 0.01,
        cc_pct: 0.04,
        res_mo: 6,
    })

    // Derived calculations
    const [results, setResults] = useState({
        gmi: 0,
        loan: 0,
        down_pmt: 0,
        pi: 0,
        tax: 0,
        ins: 0,
        pmi: 0,
        total_cash_needed: 0,
        cash_remaining: 0,
        front_end: 0,
        back_end: 0,
        net_worth: 0,
        equity_pct_of_nw: 0,
        layoff_months: 0,
    })

    // Scenarios for locked variable
    const [scenarios, setScenarios] = useState([])

    // Approval thresholds
    const thresholds = {
        conservative: { front_end: 0.28, back_end: 0.36, net_worth: 0.30 },
        moderate: { front_end: 0.33, back_end: 0.43, net_worth: 0.50 },
        aggressive: { front_end: 0.4, back_end: 0.45, net_worth: 0.65 },
    }

    const calculateResults = () => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const loan = variables.h_price.value * (1 - variables.dp_pct.value)
        const down_pmt = variables.h_price.value * variables.dp_pct.value

        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

        const tax = (variables.h_price.value * parameters.pt_rate) / 12
        const ins = (variables.h_price.value * parameters.hi_rate) / 12
        const pmi = variables.dp_pct.value < 0.2 ? (loan * parameters.pmi_rate) / 12 : 0

        const piti = pi + tax + ins + pmi
        const total_cash_needed = down_pmt + (variables.h_price.value * parameters.cc_pct) + (piti * parameters.res_mo)
        const cash_remaining = variables.cash_avail.value - total_cash_needed

        const front_end = piti / gmi
        const back_end = (piti + variables.omd.value) / gmi

        const net_worth = variables.total_assets.value - variables.total_liabilities.value
        const equity_pct_of_nw = net_worth > 0 ? down_pmt / net_worth : 0
        const layoff_months = variables.cash_avail.value / piti

        // Update results first
        setResults({
            gmi, loan, down_pmt, pi, tax, ins, pmi,
            total_cash_needed, cash_remaining, front_end, back_end,
            net_worth, equity_pct_of_nw, layoff_months
        })

        // Update calculated variables if they're not locked (but only if values actually changed)
        if (!variables.piti.locked && Math.abs(variables.piti.value - piti) > 0.01) {
            setVariables(prev => ({
                ...prev,
                piti: { ...prev.piti, value: piti }
            }))
        }

        if (!variables.cash_remaining.locked && Math.abs(variables.cash_remaining.value - cash_remaining) > 0.01) {
            setVariables(prev => ({
                ...prev,
                cash_remaining: { ...prev.cash_remaining, value: cash_remaining }
            }))
        }
    }

    const generateScenarios = () => {
        const lockedVar = Object.keys(variables).find(key => variables[key].locked)
        if (!lockedVar) {
            setScenarios([])
            return
        }

        // Generate scenarios based on what's locked
        if (lockedVar === 'h_price') {
            const scenarios = ['conservative', 'moderate', 'aggressive'].map(scenario => {
                const maxPrice = calculateMaxPrice(scenario)
                return {
                    name: scenario,
                    value: maxPrice,
                    status: getScenarioStatus(maxPrice, scenario),
                    actionText: `House up to ${formatCurrency(maxPrice)}`
                }
            })
            setScenarios(scenarios)
        } else if (lockedVar === 'piti') {
            const scenarios = ['conservative', 'moderate', 'aggressive'].map(scenario => {
                const maxPayment = calculateMaxPayment(scenario)
                return {
                    name: scenario,
                    value: maxPayment,
                    status: getScenarioStatus(null, scenario, maxPayment),
                    actionText: `Payment up to ${formatCurrency(maxPayment)}`
                }
            })
            setScenarios(scenarios)
        } else if (lockedVar === 'cash_remaining') {
            const targetAmounts = [25000, 50000, 100000] // Conservative, moderate, aggressive cash targets
            const scenarios = targetAmounts.map((amount, idx) => {
                const scenario = ['conservative', 'moderate', 'aggressive'][idx]
                const maxPrice = calculateMaxPriceForCashTarget(amount)
                return {
                    name: scenario,
                    value: amount,
                    status: getScenarioStatus(maxPrice, scenario),
                    actionText: `Keep ${formatCurrency(amount)} cash buffer`
                }
            })
            setScenarios(scenarios)
        } else if (lockedVar === 'dp_pct') {
            const targetPercentages = [0.05, 0.1, 0.2] // 5%, 10%, 20% down
            const scenarios = targetPercentages.map((pct, idx) => {
                const scenario = ['aggressive', 'moderate', 'conservative'][idx]
                return {
                    name: scenario,
                    value: pct,
                    status: getScenarioStatus(variables.h_price.value, scenario),
                    actionText: `${formatPercent(pct)} down payment`
                }
            })
            setScenarios(scenarios)
        } else {
            setScenarios([])
        }
    }

    // Calculate everything when variables change
    useEffect(() => {
        calculateResults()
        generateScenarios()
    }, [variables, parameters])

    const calculateMaxPrice = (scenario) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const maxFrontEnd = gmi * thresholds[scenario].front_end
        const maxBackEnd = gmi * thresholds[scenario].back_end - variables.omd.value
        const maxPiti = Math.min(maxFrontEnd, maxBackEnd)

        // Simplified calculation - would need iterative approach for precision
        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const paymentFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        const taxInsPct = (parameters.pt_rate + parameters.hi_rate) / 12
        const pmiPct = variables.dp_pct.value < 0.2 ? parameters.pmi_rate / 12 : 0

        const combinedFactor = paymentFactor + taxInsPct / (1 - variables.dp_pct.value) + pmiPct * (1 - variables.dp_pct.value)
        const maxLoan = maxPiti / combinedFactor
        return maxLoan / (1 - variables.dp_pct.value)
    }

    const calculateMaxPayment = (scenario) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const maxFrontEnd = gmi * thresholds[scenario].front_end
        const maxBackEnd = gmi * thresholds[scenario].back_end - variables.omd.value
        return Math.min(maxFrontEnd, maxBackEnd)
    }

    const calculateMaxPriceForCashTarget = (targetCashRemaining) => {
        // Iterative approach to find max price that leaves target cash remaining
        let price = variables.h_price.value
        let iterations = 0
        const maxIterations = 20

        while (iterations < maxIterations) {
            const downPmt = price * variables.dp_pct.value
            const closingCosts = price * parameters.cc_pct
            const r = variables.i_yr.value / 12
            const n = variables.t_yrs.value * 12
            const loan = price * (1 - variables.dp_pct.value)
            const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
            const tax = (price * parameters.pt_rate) / 12
            const ins = (price * parameters.hi_rate) / 12
            const pmi = variables.dp_pct.value < 0.2 ? (loan * parameters.pmi_rate) / 12 : 0
            const piti = pi + tax + ins + pmi
            const reserves = piti * parameters.res_mo

            const totalCashNeeded = downPmt + closingCosts + reserves
            const cashRemaining = variables.cash_avail.value - totalCashNeeded

            if (Math.abs(cashRemaining - targetCashRemaining) < 1000) {
                break
            }

            if (cashRemaining > targetCashRemaining) {
                price += 10000 // Increase price
            } else {
                price -= 5000 // Decrease price
            }

            iterations++
        }

        return Math.max(price, 100000) // Don't go below 100k
    }

    const getScenarioStatus = (price, scenario, payment) => {
        const currentPrice = price || variables.h_price.value
        const currentPayment = payment || results.piti || variables.piti.value
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12

        const frontEnd = currentPayment / gmi
        const backEnd = (currentPayment + variables.omd.value) / gmi
        const cashNeeded = (currentPrice * variables.dp_pct.value) +
            (currentPrice * parameters.cc_pct) +
            (currentPayment * parameters.res_mo)

        return {
            frontEndPass: frontEnd <= thresholds[scenario].front_end,
            backEndPass: backEnd <= thresholds[scenario].back_end,
            cashPass: cashNeeded <= variables.cash_avail.value,
            frontEnd,
            backEnd,
            cashNeeded
        }
    }

    const toggleVariable = (key) => {
        setVariables(prev => {
            // First unlock all variables
            const updated = Object.keys(prev).reduce((acc, k) => {
                acc[k] = { ...prev[k], locked: false }
                return acc
            }, {})

            // Then lock the selected one
            updated[key] = { ...prev[key], locked: true }

            return updated
        })
    }

    const updateVariable = (key, value) => {
        setVariables(prev => ({
            ...prev,
            [key]: { ...prev[key], value: parseFloat(value) || 0 }
        }))
    }

    const applyScenario = (scenario) => {
        const lockedVar = Object.keys(variables).find(key => variables[key].locked)
        if (!lockedVar) return

        // Apply the scenario value to the locked variable
        setVariables(prev => ({
            ...prev,
            [lockedVar]: { ...prev[lockedVar], value: scenario.value }
        }))

        // For certain scenarios, also update related variables
        if (lockedVar === 'cash_remaining') {
            // Calculate and set the corresponding house price
            const maxPrice = calculateMaxPriceForCashTarget(scenario.value)
            setVariables(prev => ({
                ...prev,
                h_price: { ...prev.h_price, value: maxPrice }
            }))
        }
    }

    const formatValue = (value, format) => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                }).format(value)
            case 'percent':
                return new Intl.NumberFormat("en-US", {
                    style: "percent",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(value)
            case 'years':
                return `${value} years`
            default:
                return value.toString()
        }
    }

    const getInputValue = (value, format) => {
        switch (format) {
            case 'percent':
                return value * 100
            default:
                return value
        }
    }

    const getContextualInfo = (key, value) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12

        switch (key) {
            case 'piti':
                const frontEndRatio = value / gmi
                return (
                    <div className="text-xs text-muted-foreground">
                        {formatPercent(frontEndRatio)} of income
                        <div className={`${frontEndRatio <= thresholds.moderate.front_end ? 'text-green-600' : 'text-red-600'}`}>
                            {frontEndRatio <= thresholds.conservative.front_end ? '✓ Conservative' :
                                frontEndRatio <= thresholds.moderate.front_end ? '✓ Moderate' :
                                    frontEndRatio <= thresholds.aggressive.front_end ? '⚠ Aggressive' : '✗ Too High'}
                        </div>
                    </div>
                )
            case 'cash_remaining':
                const months = value > 0 ? value / (variables.piti.value || 3000) : 0
                return (
                    <div className="text-xs text-muted-foreground">
                        {months > 0 ? `${months.toFixed(1)} mo emergency fund` : 'No buffer'}
                        <div className={`${value >= 50000 ? 'text-green-600' : value >= 25000 ? 'text-orange-600' : 'text-red-600'}`}>
                            {value >= 50000 ? '✓ Good buffer' : value >= 25000 ? '⚠ Tight' : '✗ Risky'}
                        </div>
                    </div>
                )
            case 'dp_pct':
                const needsPMI = value < 0.2
                return (
                    <div className="text-xs text-muted-foreground">
                        ${Math.round(variables.h_price.value * value / 1000)}k down
                        <div className={`${needsPMI ? 'text-orange-600' : 'text-green-600'}`}>
                            {needsPMI ? '⚠ PMI required' : '✓ No PMI'}
                        </div>
                    </div>
                )
            case 'h_price':
                const pricePerSqFt = 350 // Rough estimate, could be input
                const sqft = Math.round(value / pricePerSqFt)
                return (
                    <div className="text-xs text-muted-foreground">
                        ~{sqft.toLocaleString()} sq ft
                        <div className="text-gray-500">
                            @ ${pricePerSqFt}/sq ft
                        </div>
                    </div>
                )
            case 'total_assets':
                const netWorth = value - variables.total_liabilities.value
                return (
                    <div className="text-xs text-muted-foreground">
                        Net: {formatCurrency(netWorth)}
                        <div className={`${netWorth > 200000 ? 'text-green-600' : 'text-orange-600'}`}>
                            {netWorth > 500000 ? '✓ Strong' : netWorth > 200000 ? '✓ Good' : '⚠ Building'}
                        </div>
                    </div>
                )
            case 'cash_avail':
                const utilizationPct = results.total_cash_needed / value
                return (
                    <div className="text-xs text-muted-foreground">
                        {formatPercent(utilizationPct)} utilization
                        <div className={`${utilizationPct <= 0.8 ? 'text-green-600' : 'text-red-600'}`}>
                            {utilizationPct <= 0.6 ? '✓ Conservative' : utilizationPct <= 0.8 ? '✓ Moderate' : '✗ Tight'}
                        </div>
                    </div>
                )
            case 'omd':
                const backEndImpact = value / gmi
                return (
                    <div className="text-xs text-muted-foreground">
                        {formatPercent(backEndImpact)} of income
                        <div className={`${backEndImpact <= 0.1 ? 'text-green-600' : 'text-orange-600'}`}>
                            {backEndImpact <= 0.05 ? '✓ Low debt' : backEndImpact <= 0.15 ? '⚠ Moderate' : '✗ High debt'}
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    const formatPercent = (value) => {
        return new Intl.NumberFormat("en-US", {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(value)
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(value)
    }

    const lockedVariable = Object.keys(variables).find(key => variables[key].locked)

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Calculator className="h-5 w-5 mr-2" />
                        Dynamic House Calculator
                    </CardTitle>
                    <CardDescription>
                        Click the lock icon on any variable to solve for it. All other variables become inputs.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Dynamic Variables Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Variables</CardTitle>
                    <CardDescription>
                        {lockedVariable
                            ? `Solving for: ${variables[lockedVariable].label}`
                            : "Select a variable to solve for by clicking its lock icon"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(variables).map(([key, variable]) => {
                            const Icon = variable.icon
                            const isLocked = variable.locked

                            return (
                                <TooltipProvider key={key}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={`p-4 border rounded-lg transition-all ${isLocked
                                                ? 'bg-blue-50 border-blue-300 shadow-md'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleVariable(key)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        {isLocked ? (
                                                            <Target className="h-3 w-3 text-blue-600" />
                                                        ) : (
                                                            <Lock className="h-3 w-3 text-gray-400" />
                                                        )}
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium">{variable.label}</Label>
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                        {variable.description}
                                                    </div>

                                                    {isLocked ? (
                                                        <div className="bg-blue-100 p-2 rounded text-center">
                                                            <div className="text-sm font-bold text-blue-800">
                                                                🎯 Solving for this
                                                            </div>
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                See scenarios below
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            value={getInputValue(variable.value, variable.format)}
                                                            onChange={(e) => {
                                                                const val = variable.format === 'percent'
                                                                    ? parseFloat(e.target.value) / 100
                                                                    : parseFloat(e.target.value)
                                                                updateVariable(key, val)
                                                            }}
                                                            className="text-sm"
                                                            step={variable.format === 'percent' ? '0.01' : '1000'}
                                                        />
                                                    )}

                                                    <div className="text-center">
                                                        <div className="text-sm font-bold">
                                                            {formatValue(variable.value, variable.format)}
                                                        </div>
                                                        {getContextualInfo(key, variable.value)}
                                                    </div>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Click the {isLocked ? 'target' : 'lock'} icon to {isLocked ? 'unlock' : 'solve for'} this variable</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Scenario Results for Locked Variable */}
            {lockedVariable && scenarios.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Scenarios for {variables[lockedVariable].label}
                        </CardTitle>
                        <CardDescription>
                            See how different risk levels affect your target variable
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {scenarios.map((scenario) => (
                                <div key={scenario.name} className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => applyScenario(scenario)}>
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant={
                                            scenario.name === 'conservative' ? 'default' :
                                                scenario.name === 'moderate' ? 'secondary' : 'outline'
                                        }>
                                            {scenario.name.charAt(0).toUpperCase() + scenario.name.slice(1)}
                                        </Badge>
                                        <div className="text-lg font-bold">
                                            {formatValue(scenario.value, variables[lockedVariable].format)}
                                        </div>
                                    </div>

                                    <div className="text-xs text-center mb-2 text-muted-foreground">
                                        {scenario.actionText}
                                    </div>

                                    <div className="space-y-1 text-xs">
                                        <div className={`flex justify-between ${scenario.status.frontEndPass ? 'text-green-600' : 'text-red-600'}`}>
                                            <span>Housing DTI:</span>
                                            <span>{formatValue(scenario.status.frontEnd, 'percent')}</span>
                                        </div>
                                        <div className={`flex justify-between ${scenario.status.backEndPass ? 'text-green-600' : 'text-red-600'}`}>
                                            <span>Total DTI:</span>
                                            <span>{formatValue(scenario.status.backEnd, 'percent')}</span>
                                        </div>
                                        <div className={`flex justify-between ${scenario.status.cashPass ? 'text-green-600' : 'text-red-600'}`}>
                                            <span>Cash Needed:</span>
                                            <span>{formatValue(scenario.status.cashNeeded, 'currency')}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-3"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            applyScenario(scenario)
                                        }}
                                    >
                                        Apply This Scenario
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Key Metrics Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Scenario Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Monthly Income</div>
                            <div className="text-lg font-bold">{formatValue(results.gmi, 'currency')}</div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Housing DTI</div>
                            <div className="text-lg font-bold">{formatValue(results.front_end, 'percent')}</div>
                            <div className="text-xs text-muted-foreground">
                                {results.front_end <= thresholds.conservative.front_end ? '✓ Conservative' :
                                    results.front_end <= thresholds.moderate.front_end ? '✓ Moderate' :
                                        results.front_end <= thresholds.aggressive.front_end ? '⚠ Aggressive' : '✗ Too High'}
                            </div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Cash Remaining</div>
                            <div className={`text-lg font-bold ${results.cash_remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatValue(results.cash_remaining, 'currency')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                After purchase
                            </div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Net Worth in Home</div>
                            <div className="text-lg font-bold">{formatValue(results.equity_pct_of_nw, 'percent')}</div>
                            <div className="text-xs text-muted-foreground">
                                {results.equity_pct_of_nw <= thresholds.conservative.net_worth ? 'Conservative' :
                                    results.equity_pct_of_nw <= thresholds.moderate.net_worth ? 'Moderate' :
                                        results.equity_pct_of_nw <= thresholds.aggressive.net_worth ? 'Aggressive' : 'High Risk'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 