// @ts-nocheck
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
    Calculator,
    Shield,
    FileText,
    Wallet,
    Wrench,
    Construction
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const variableGroups = [
    {
        name: "Purchase",
        keys: ["h_price", "dp_pct"]
    },
    {
        name: "Loan & Rates",
        keys: ["i_yr", "t_yrs"]
    },
    {
        name: "Income",
        keys: ["n_inc", "s_inc"]
    },
    {
        name: "Debts",
        keys: ["car_pmt", "margin_pmt", "other_debt"]
    },
    {
        name: "Cash & Assets",
        keys: ["cash_avail", "total_assets", "total_liabilities"]
    },
    {
        name: "Ongoing Costs",
        keys: ["pt_rate", "hi_rate", "upkeep_costs"]
    },
    {
        name: "Closing & One-Time",
        keys: ["cc_pct", "reno_budget", "res_mo"]
    },
]

const calculatedVariableDefinitions = {
    piti: { label: "Monthly Payment (PITI)", icon: DollarSign, format: "currency", description: "Total housing payment" },
    cash_remaining: { label: "Cash Remaining", icon: Wallet, format: "currency", description: "Cash left after all costs" }
};

const defaultVariables = {
    h_price: { value: 750000, locked: false, label: "Home Price", icon: Home, format: "currency", description: "Target purchase price" },
    dp_pct: { value: 0.2, locked: false, label: "Down Payment %", icon: Percent, format: "percent", description: "Percent of price paid upfront" },
    i_yr: { value: 0.0675, locked: false, label: "Interest Rate", icon: Percent, format: "percent", description: "Annual mortgage rate" },
    t_yrs: { value: 30, locked: false, label: "Loan Term", icon: Calendar, format: "years", description: "Mortgage term length" },
    n_inc: { value: 170000, locked: false, label: "Nicole's Income", icon: DollarSign, format: "currency", description: "Annual gross income" },
    s_inc: { value: 80000, locked: false, label: "Scott's Income", icon: DollarSign, format: "currency", description: "Annual gross income" },
    cash_avail: { value: 200000, locked: false, label: "Available Cash", icon: DollarSign, format: "currency", description: "Liquid cash for purchase" },
    total_assets: { value: 400000, locked: false, label: "Total Assets", icon: PieChart, format: "currency", description: "All investments, cash, property" },
    total_liabilities: { value: 50000, locked: false, label: "Total Liabilities", icon: PieChart, format: "currency", description: "All debts and obligations" },
    pt_rate: { value: 0.0125, locked: false, label: "Property Tax Rate", icon: Percent, format: "percent", description: "Annual property tax as % of home value" },
    hi_rate: { value: 0.004, locked: false, label: "Home Insurance + HOA", icon: Shield, format: "percent", description: "Annual insurance + HOA as % of home value" },
    upkeep_costs: { value: 250, locked: false, label: "Monthly Upkeep", icon: Construction, format: "currency", description: "Estimated monthly maintenance/repairs" },
    cc_pct: { value: 0.04, locked: false, label: "Closing Costs", icon: FileText, format: "percent", description: "Closing costs as % of home price" },
    reno_budget: { value: 0, locked: false, label: "Renovation Budget", icon: Wrench, format: "currency", description: "Budget for immediate renovations" },
    res_mo: { value: 6, locked: false, label: "Required Reserves", icon: Wallet, format: "months", description: "Months of PITI in reserves" },
    car_pmt: { value: 0, locked: false, label: "Car Loan Payment", icon: DollarSign, format: "currency", description: "Monthly car loan payment" },
    margin_pmt: { value: 0, locked: false, label: "Margin/HELOC Payment", icon: DollarSign, format: "currency", description: "Monthly interest or required payment on margin or HELOC" },
    other_debt: { value: 0, locked: false, label: "Other Monthly Debt", icon: DollarSign, format: "currency", description: "CC minimums, student loans, etc." },
};

export default function DynamicCalculator() {
    const [variables, setVariables] = useState(defaultVariables);
    const [isLoaded, setIsLoaded] = useState(false);
    const [scenarios, setScenarios] = useState([]);

    // Load state from localStorage on initial client-side render
    useEffect(() => {
        try {
            const savedValues = localStorage.getItem("houseCalculatorInputs");
            if (savedValues) {
                const parsedValues = JSON.parse(savedValues);
                const newVariables = { ...defaultVariables };
                Object.keys(parsedValues).forEach(key => {
                    if (newVariables[key] && parsedValues[key] !== undefined) {
                        newVariables[key] = {
                            ...newVariables[key], // Keep label, icon, etc. from defaults
                            value: parsedValues[key].value, // Use the saved value
                            locked: false // Always unlock on page load
                        };
                    }
                });
                setVariables(newVariables);
            }
        } catch (error) {
            console.error("Error reading from localStorage", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save state to localStorage whenever it changes, but only after initial load
    useEffect(() => {
        if (isLoaded) {
            try {
                // Create an object with just the values to save
                const valuesToSave = {};
                Object.keys(variables).forEach(key => {
                    valuesToSave[key] = { value: variables[key].value };
                });
                localStorage.setItem("houseCalculatorInputs", JSON.stringify(valuesToSave));
            } catch (error) {
                console.error("Error writing to localStorage", error);
            }
        }
    }, [variables, isLoaded]);

    // Fixed parameters (rates and percentages that typically don't change)
    const parameters = {
        pmi_rate: 0.01, // Keep PMI rate as fixed since it's typically set by lender
    }

    // All calculations are now derived state, computed on each render
    const derivedResults = React.useMemo(() => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const loan = variables.h_price.value * (1 - variables.dp_pct.value)
        const down_pmt = variables.h_price.value * variables.dp_pct.value

        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const pi =
            n > 0 && r > 0
                ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
                : n > 0 ? loan / n : 0

        const tax = (variables.h_price.value * variables.pt_rate.value) / 12
        const ins = (variables.h_price.value * variables.hi_rate.value) / 12

        const pmi = variables.dp_pct.value < 0.2 ? (loan * parameters.pmi_rate) / 12 : 0

        const piti = pi + tax + ins + pmi + variables.upkeep_costs.value
        const total_cash_needed =
            down_pmt +
            variables.h_price.value * variables.cc_pct.value +
            piti * variables.res_mo.value +
            variables.reno_budget.value

        const otherDebt = variables.car_pmt.value + variables.margin_pmt.value + variables.other_debt.value
        const cash_remaining = variables.cash_avail.value - total_cash_needed

        const front_end = gmi > 0 ? piti / gmi : 0
        const back_end = gmi > 0 ? (piti + otherDebt) / gmi : 0

        const net_worth = variables.total_assets.value - variables.total_liabilities.value
        const equity_pct_of_nw = net_worth > 0 ? down_pmt / net_worth : 0
        const layoff_months = piti > 0 ? variables.cash_avail.value / piti : 0

        return {
            gmi,
            loan,
            down_pmt,
            pi,
            tax,
            ins,
            pmi,
            piti,
            total_cash_needed,
            cash_remaining,
            front_end,
            back_end,
            net_worth,
            equity_pct_of_nw,
            layoff_months,
        }
    }, [variables])

    // Approval thresholds
    const thresholds = {
        conservative: { front_end: 0.28, back_end: 0.36, net_worth: 0.30 },
        moderate: { front_end: 0.33, back_end: 0.43, net_worth: 0.50 },
        aggressive: { front_end: 0.4, back_end: 0.45, net_worth: 0.65 },
    }

    const calculateScenarioDetails = (dp_pct) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const loan = variables.h_price.value * (1 - dp_pct)
        const down_pmt = variables.h_price.value * dp_pct

        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const pi =
            n > 0 && r > 0
                ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
                : n > 0 ? loan / n : 0

        const tax = (variables.h_price.value * variables.pt_rate.value) / 12
        const ins = (variables.h_price.value * variables.hi_rate.value) / 12
        const pmi = dp_pct < 0.2 ? (loan * parameters.pmi_rate) / 12 : 0
        const piti = pi + tax + ins + pmi + variables.upkeep_costs.value

        const total_cash_needed =
            down_pmt +
            variables.h_price.value * variables.cc_pct.value +
            piti * variables.res_mo.value +
            variables.reno_budget.value

        const otherDebt = variables.car_pmt.value + variables.margin_pmt.value + variables.other_debt.value
        const front_end = gmi > 0 ? piti / gmi : 0
        const back_end = gmi > 0 ? (piti + otherDebt) / gmi : 0

        return {
            frontEnd: front_end,
            backEnd: back_end,
            cashNeeded: total_cash_needed,
        };
    }

    const generateScenarios = () => {
        const lockedVarKey = Object.keys(variables).find(key => variables[key].locked)
        if (!lockedVarKey) {
            setScenarios([])
            return
        }

        // Generate scenarios based on what's locked
        if (lockedVarKey === 'h_price') {
            const newScenarios = ['conservative', 'moderate', 'aggressive'].map(scenario => {
                const maxPrice = calculateMaxPrice(scenario)
                return {
                    name: scenario,
                    value: maxPrice,
                    status: getScenarioStatus(maxPrice, scenario),
                    actionText: `House up to ${formatCurrency(maxPrice)}`
                }
            })
            setScenarios(newScenarios)
        } else if (lockedVarKey === 'piti') {
            const newScenarios = ['conservative', 'moderate', 'aggressive'].map(scenario => {
                const maxPayment = calculateMaxPayment(scenario)
                return {
                    name: scenario,
                    value: maxPayment,
                    status: getScenarioStatus(null, scenario, maxPayment),
                    actionText: `Payment up to ${formatCurrency(maxPayment)}`
                }
            })
            setScenarios(newScenarios)
        } else if (lockedVarKey === 'cash_remaining') {
            const targetAmounts = [25000, 50000, 100000] // Conservative, moderate, aggressive cash targets
            const newScenarios = targetAmounts.map((amount, idx) => {
                const scenario = ['conservative', 'moderate', 'aggressive'][idx]
                const maxPrice = calculateMaxPriceForCashTarget(amount)
                return {
                    name: scenario,
                    value: amount,
                    status: getScenarioStatus(maxPrice, scenario),
                    actionText: `Keep ${formatCurrency(amount)} cash buffer`
                }
            })
            setScenarios(newScenarios)
        } else if (lockedVarKey === 'dp_pct') {
            // Helper to iteratively solve for the minimum down payment percentage
            const solveForDpPct = (scenarioKey) => {
                const maxIterations = 25;
                let min = 0.0;
                let upper = 0.95; // cap to 95% to avoid rounding issues
                let best = null;

                for (let i = 0; i < maxIterations; i++) {
                    const mid = (min + upper) / 2;
                    const details = calculateScenarioDetails(mid);

                    // Check against scenario thresholds
                    if (
                        details.frontEnd <= thresholds[scenarioKey].front_end &&
                        details.backEnd <= thresholds[scenarioKey].back_end
                    ) {
                        best = mid; // feasible, try lowering DP to find minimum that still passes
                        upper = mid;
                    } else {
                        min = mid;
                    }

                    // Break if range is sufficiently small
                    if (upper - min < 0.0001) break;
                }

                return best;
            };

            const scenarioOrder = ['conservative', 'moderate', 'aggressive'];

            const computedScenarios = scenarioOrder.map((scenarioKey) => {
                const dpSolution = solveForDpPct(scenarioKey);

                // If not solvable within limits, mark scenario invalid
                if (dpSolution === null) {
                    return {
                        name: scenarioKey,
                        value: null,
                        status: {
                            overallPass: false,
                            frontEnd: NaN,
                            backEnd: NaN,
                            cashNeeded: NaN,
                            frontEndPass: false,
                            backEndPass: false,
                            cashPass: false,
                        },
                        actionText: 'Not achievable'
                    };
                }

                const details = calculateScenarioDetails(dpSolution);

                const status = {
                    frontEnd: details.frontEnd,
                    backEnd: details.backEnd,
                    cashNeeded: details.cashNeeded,
                    frontEndPass: true, // by construction it passes
                    backEndPass: true,
                    cashPass: details.cashNeeded <= variables.cash_avail.value,
                };
                status.overallPass = status.frontEndPass && status.backEndPass && status.cashPass;

                const downPaymentCash = variables.h_price.value * dpSolution;
                const loanAmount = variables.h_price.value - downPaymentCash;

                return {
                    name: scenarioKey,
                    value: dpSolution,
                    status,
                    actionText: `${formatCurrency(downPaymentCash)} cash down`,
                    downPayment: downPaymentCash,
                    loanAmount: loanAmount,
                };
            }).filter(Boolean);

            setScenarios(computedScenarios)
        } else {
            setScenarios([])
        }
    }

    // This effect now only generates scenarios when inputs change
    useEffect(() => {
        const lockedVar = Object.keys(variables).find(key => variables[key].locked)
        if (lockedVar) {
            generateScenarios()
        } else {
            setScenarios([])
        }
    }, [variables])

    const calculateMaxPrice = (scenario) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const maxFrontEnd = gmi * thresholds[scenario].front_end
        const otherDebt = variables.car_pmt.value + variables.margin_pmt.value + variables.other_debt.value
        const maxBackEnd = gmi * thresholds[scenario].back_end - otherDebt
        const maxPiti = Math.min(maxFrontEnd, maxBackEnd)

        // Simplified calculation - would need iterative approach for precision
        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const paymentFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        const taxInsPct = (variables.pt_rate.value + variables.hi_rate.value) / 12

        const pmi_rate = 0.01
        const pmiPct = variables.dp_pct.value < 0.2 ? pmi_rate / 12 : 0

        const combinedFactor = paymentFactor + taxInsPct / (1 - variables.dp_pct.value) + pmiPct * (1 - variables.dp_pct.value)
        const maxLoan = maxPiti > 0 && combinedFactor > 0 ? maxPiti / combinedFactor : 0
        return maxLoan / (1 - variables.dp_pct.value)
    }

    const calculateMaxPayment = (scenario) => {
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12
        const maxFrontEnd = gmi * thresholds[scenario].front_end
        const otherDebt = variables.car_pmt.value + variables.margin_pmt.value + variables.other_debt.value
        const maxBackEnd = gmi * thresholds[scenario].back_end - otherDebt
        return Math.min(maxFrontEnd, maxBackEnd)
    }

    const calculateMaxPriceForCashTarget = (targetCashRemaining) => {
        // Iterative approach to find max price that leaves target cash remaining
        let price = variables.h_price.value
        let iterations = 0
        const maxIterations = 20

        while (iterations < maxIterations) {
            const downPmt = price * variables.dp_pct.value
            const closingCosts = price * variables.cc_pct.value
            const r = variables.i_yr.value / 12
            const n = variables.t_yrs.value * 12
            const loan = price * (1 - variables.dp_pct.value)
            const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
            const tax = (price * variables.pt_rate.value) / 12
            const ins = (price * variables.hi_rate.value) / 12

            const pmi_rate = 0.01
            const pmi = variables.dp_pct.value < 0.2 ? (loan * pmi_rate) / 12 : 0
            const piti = pi + tax + ins + pmi + variables.upkeep_costs.value
            const reserves = piti * variables.res_mo.value

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
        const gmi = (variables.n_inc.value + variables.s_inc.value) / 12

        // Recalculate PITI for the scenario
        const r = variables.i_yr.value / 12
        const n = variables.t_yrs.value * 12
        const loan = currentPrice * (1 - variables.dp_pct.value)
        const pi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        const tax = (currentPrice * variables.pt_rate.value) / 12
        const ins = (currentPrice * variables.hi_rate.value) / 12

        const pmi_rate = 0.01
        const pmi = variables.dp_pct.value < 0.2 ? (loan * pmi_rate) / 12 : 0
        const piti = pi + tax + ins + pmi + variables.upkeep_costs.value

        const currentPayment = payment || piti

        const otherDebt = variables.car_pmt.value + variables.margin_pmt.value + variables.other_debt.value
        const frontEnd = gmi > 0 ? currentPayment / gmi : 0
        const backEnd = gmi > 0 ? (currentPayment + otherDebt) / gmi : 0
        const cashNeeded =
            currentPrice * variables.dp_pct.value +
            currentPrice * variables.cc_pct.value +
            currentPayment * variables.res_mo.value +
            variables.reno_budget.value

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
            const isCurrentlyLocked = prev[key].locked

            if (isCurrentlyLocked) {
                // If clicking on already locked variable, unlock it
                return {
                    ...prev,
                    [key]: { ...prev[key], locked: false }
                }
            } else {
                // First unlock all variables
                const updated = Object.keys(prev).reduce((acc, k) => {
                    acc[k] = { ...prev[k], locked: false }
                    return acc
                }, {})

                // Then lock the selected one
                updated[key] = { ...prev[key], locked: true }

                return updated
            }
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
                const status = frontEndRatio <= thresholds.conservative.front_end ? '✓ Conservative' :
                    frontEndRatio <= thresholds.moderate.front_end ? '✓ Moderate' :
                        frontEndRatio <= thresholds.aggressive.front_end ? '⚠ Aggressive' : '✗ Too High'
                const statusColor = frontEndRatio <= thresholds.moderate.front_end ? 'text-green-600' : 'text-red-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(frontEndRatio)} of income</span>
                        <span className={statusColor}>{status}</span>
                    </>
                )
            case 'cash_remaining':
                const months = value > 0 ? value / (derivedResults.piti || 3000) : 0
                const bufferStatus = value >= 50000 ? '✓ Good buffer' : value >= 25000 ? '⚠ Tight' : '✗ Risky'
                const bufferColor = value >= 50000 ? 'text-green-600' : value >= 25000 ? 'text-orange-600' : 'text-red-600'
                return (
                    <>
                        <span className="text-muted-foreground">{months > 0 ? `${months.toFixed(1)} mo fund` : 'No buffer'}</span>
                        <span className={bufferColor}>{bufferStatus}</span>
                    </>
                )
            case 'dp_pct':
                const needsPMI = value < 0.2
                const pmiStatus = needsPMI ? '⚠ PMI required' : '✓ No PMI'
                const pmiColor = needsPMI ? 'text-orange-600' : 'text-green-600'
                return (
                    <>
                        <span className="text-muted-foreground">${Math.round(variables.h_price.value * value / 1000)}k down</span>
                        <span className={pmiColor}>{pmiStatus}</span>
                    </>
                )
            case 'h_price':
                const pricePerSqFt = 350 // Rough estimate, could be input
                const sqft = Math.round(value / pricePerSqFt)
                return (
                    <>
                        <span className="text-muted-foreground">~{sqft.toLocaleString()} sq ft</span>
                        <span className="text-gray-500">@ ${pricePerSqFt}/sq ft</span>
                    </>
                )
            case 'total_assets':
                const netWorth = value - variables.total_liabilities.value
                const nwStatus = netWorth > 500000 ? '✓ Strong' : netWorth > 200000 ? '✓ Good' : '⚠ Building'
                const nwColor = netWorth > 200000 ? 'text-green-600' : 'text-orange-600'
                return (
                    <>
                        <span className="text-muted-foreground">Net: {formatCurrency(netWorth)}</span>
                        <span className={nwColor}>{nwStatus}</span>
                    </>
                )
            case 'cash_avail':
                const utilizationPct = value > 0 ? derivedResults.total_cash_needed / value : 0
                const utilStatus = utilizationPct <= 0.6 ? '✓ Conservative' : utilizationPct <= 0.8 ? '✓ Moderate' : '✗ Tight'
                const utilColor = utilizationPct <= 0.8 ? 'text-green-600' : 'text-red-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(utilizationPct)} utilization</span>
                        <span className={utilColor}>{utilStatus}</span>
                    </>
                )
            case 'car_pmt':
                const carPmtPct = variables.h_price.value > 0 ? value / variables.h_price.value : 0
                const carPmtStatus = carPmtPct <= 0.05 ? '✓ Low' : carPmtPct <= 0.15 ? '✓ Typical' : '⚠ High'
                const carPmtColor = carPmtPct <= 0.05 ? 'text-green-600' : 'text-orange-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(carPmtPct)}/yr of price</span>
                        <span className={carPmtColor}>{carPmtStatus}</span>
                    </>
                )
            case 'margin_pmt':
                const marginPmtPct = variables.h_price.value > 0 ? value / variables.h_price.value : 0
                const marginPmtStatus = marginPmtPct <= 0.01 ? '✓ Low' : marginPmtPct <= 0.02 ? '✓ Typical' : '⚠ High'
                const marginPmtColor = marginPmtPct <= 0.02 ? 'text-green-600' : 'text-orange-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(marginPmtPct)}/yr of price</span>
                        <span className={marginPmtColor}>{marginPmtStatus}</span>
                    </>
                )
            case 'other_debt':
                const otherDebtPct = variables.h_price.value > 0 ? value / variables.h_price.value : 0
                const otherDebtStatus = otherDebtPct <= 0.05 ? '✓ Low' : otherDebtPct <= 0.15 ? '⚠ Moderate' : '✗ High'
                const otherDebtColor = otherDebtPct <= 0.1 ? 'text-green-600' : 'text-orange-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(otherDebtPct)} of price</span>
                        <span className={otherDebtColor}>{otherDebtStatus}</span>
                    </>
                )
            case 'res_mo':
                const resAmount = derivedResults.piti * value
                const resStatus = value >= 6 ? '✓ Safe' : value >= 3 ? '⚠ Tight' : '✗ Risky'
                const resColor = value >= 6 ? 'text-green-600' : value >= 3 ? 'text-orange-600' : 'text-red-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatCurrency(resAmount)} reserve</span>
                        <span className={resColor}>{resStatus}</span>
                    </>
                )
            case 'reno_budget':
                const renoPct = variables.h_price.value > 0 ? value / variables.h_price.value : 0
                const renoStatus = renoPct <= 0.05 ? '✓ Light' : renoPct <= 0.15 ? '⚠ Moderate' : '✗ Major'
                const renoColor = renoPct <= 0.05 ? 'text-green-600' : renoPct <= 0.15 ? 'text-orange-600' : 'text-red-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(renoPct)} of price</span>
                        <span className={renoColor}>{renoStatus}</span>
                    </>
                )
            case 'upkeep_costs':
                const upkeepPct = variables.h_price.value > 0 ? (value * 12) / variables.h_price.value : 0
                const upkeepStatus = upkeepPct <= 0.01 ? '✓ Low' : upkeepPct <= 0.02 ? '✓ Typical' : '⚠ High'
                const upkeepColor = upkeepPct <= 0.02 ? 'text-green-600' : 'text-orange-600'
                return (
                    <>
                        <span className="text-muted-foreground">{formatPercent(upkeepPct)}/yr of price</span>
                        <span className={upkeepColor}>{upkeepStatus}</span>
                    </>
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
                        Click the calculator icon on any variable to solve for it. All other variables become inputs.
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
                            : "Select a variable to solve for by clicking its calculator icon"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={variableGroups.map(g => g.name)} className="w-full">
                        {variableGroups.map((group) => (
                            <AccordionItem value={group.name} key={group.name}>
                                <AccordionTrigger className="text-sm font-semibold">{group.name}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                        {group.keys.map(key => {
                                            let variable;
                                            if (group.isOutput) {
                                                const value = derivedResults[key]
                                                variable = {
                                                    ...calculatedVariableDefinitions[key],
                                                    value: value,
                                                    locked: true
                                                };
                                            } else {
                                                variable = variables[key];
                                            }

                                            if (!variable) return null;

                                            const Icon = variable.icon
                                            const isLocked = variable.locked

                                            return (
                                                <div key={key} className={`p-3 border rounded-lg transition-all ${isLocked
                                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                    : 'bg-white/50 border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                            <Label className="text-sm font-medium">{variable.label}</Label>
                                                        </div>
                                                        {!group.isOutput && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => toggleVariable(key)}
                                                                            className="h-6 w-6 p-0"
                                                                        >
                                                                            {isLocked ? (
                                                                                <Target className="h-4 w-4 text-blue-600" />
                                                                            ) : (
                                                                                <Calculator className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                                                            )}
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Click to {isLocked ? 'stop solving for' : 'solve for'} this variable</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="text-xs text-muted-foreground pl-1">
                                                            {variable.description}
                                                        </div>

                                                        {isLocked ? (
                                                            <div className="bg-blue-100 p-3 rounded-md text-center">
                                                                <div className="text-2xl font-bold text-blue-800 tracking-tight">
                                                                    {formatValue(variable.value, variable.format)}
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
                                                                className="text-base"
                                                                step={
                                                                    variable.format === 'percent' ? '0.01' :
                                                                        variable.format === 'months' ? '1' :
                                                                            variable.format === 'years' ? '1' : '1000'
                                                                }
                                                            />
                                                        )}

                                                        {!isLocked && getContextualInfo(key, variable.value) && (
                                                            <div className="flex justify-between items-center text-xs pt-1 px-1">
                                                                {getContextualInfo(key, variable.value)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
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
                                        {/* Helper to pick colour based on ratio */}
                                        {(() => {
                                            const ratioColor = (ratio) =>
                                                ratio <= thresholds.conservative.front_end ? 'text-green-600' :
                                                    ratio <= thresholds.moderate.front_end ? 'text-orange-600' : 'text-red-600';

                                            return (
                                                <>
                                                    <div className={`flex justify-between ${ratioColor(scenario.status.frontEnd)}`}>
                                                        <span>Housing DTI:</span>
                                                        <span>{formatValue(scenario.status.frontEnd, 'percent')}</span>
                                                    </div>
                                                    <div className={`flex justify-between ${ratioColor(scenario.status.backEnd)}`}>
                                                        <span>Total DTI:</span>
                                                        <span>{formatValue(scenario.status.backEnd, 'percent')}</span>
                                                    </div>
                                                    {/* Down payment and loan rows */}
                                                    {scenario.downPayment !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span>Cash Down:</span>
                                                            <span>{formatValue(scenario.downPayment, 'currency')}</span>
                                                        </div>
                                                    )}
                                                    {scenario.loanAmount !== undefined && (
                                                        <div className="flex justify-between">
                                                            <span>Loan Amount:</span>
                                                            <span>{formatValue(scenario.loanAmount, 'currency')}</span>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Monthly Income</div>
                            <div className="text-lg font-bold">{formatValue(derivedResults.gmi, 'currency')}</div>
                        </div>

                        {/* Monthly Payment */}
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Monthly Payment</div>
                            <div className="text-lg font-bold">{formatValue(derivedResults.piti, 'currency')}</div>
                            <div className="text-xs text-muted-foreground">
                                {formatPercent(derivedResults.front_end)} of income
                            </div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Housing DTI</div>
                            <div className="text-lg font-bold">{formatValue(derivedResults.front_end, 'percent')}</div>
                            <div className="text-xs text-muted-foreground">
                                {derivedResults.front_end <= thresholds.conservative.front_end ? '✓ Conservative' :
                                    derivedResults.front_end <= thresholds.moderate.front_end ? '✓ Moderate' :
                                        derivedResults.front_end <= thresholds.aggressive.front_end ? '⚠ Aggressive' : '✗ Too High'}
                            </div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Cash Remaining</div>
                            <div className={`text-lg font-bold ${derivedResults.cash_remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatValue(derivedResults.cash_remaining, 'currency')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                After purchase
                            </div>
                        </div>

                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground">Net Worth in Home</div>
                            <div className="text-lg font-bold">{formatValue(derivedResults.equity_pct_of_nw, 'percent')}</div>
                            <div className="text-xs text-muted-foreground">
                                {derivedResults.equity_pct_of_nw <= thresholds.conservative.net_worth ? 'Conservative' :
                                    derivedResults.equity_pct_of_nw <= thresholds.moderate.net_worth ? 'Moderate' :
                                        derivedResults.equity_pct_of_nw <= thresholds.aggressive.net_worth ? 'Aggressive' : 'High Risk'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 