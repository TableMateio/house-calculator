// @ts-nocheck
"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import {
    TrendingUp,
    DollarSign,
    Home,
    Calendar,
    Target,
    Calculator,
    Wallet
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function TimeHorizonProjections({
    variables,
    derivedResults,
    scenarios,
    selectedScenario,
    onScenarioSelect,
    formatCurrency,
    formatPercent
}) {
    const [projectionInputs, setProjectionInputs] = useState({
        timeHorizon: 10,
        homeAppreciationRate: 0.04, // 4% annual
        investmentReturn: 0.07, // 7% annual
        salaryGrowthRate: 0.03, // 3% annual
        extraPaymentMonthly: 0,
        shouldInvestExtra: false
    })

    const [expandedScenario, setExpandedScenario] = useState("all") // Show all details by default

    // Calculate projections for current scenario
    const calculateProjections = (homePrice, downPayment, loanAmount, monthlyPayment) => {
        const projections = []
        const monthlyRate = variables.i_yr.value / 12
        const totalSalary = variables.n_inc.value + variables.s_inc.value

        let currentLoanBalance = loanAmount
        let currentHomeValue = homePrice
        let currentInvestmentValue = derivedResults.cash_remaining // Start with cash remaining
        let totalCashInvested = derivedResults.cash_remaining
        let totalInterestPaid = 0
        let totalPrincipalPaid = 0
        let currentAnnualSalary = totalSalary

        for (let year = 0; year <= projectionInputs.timeHorizon; year++) {
            // Calculate for this year
            if (year > 0) {
                // Update salary with growth
                currentAnnualSalary *= (1 + projectionInputs.salaryGrowthRate)

                // Home appreciation
                currentHomeValue *= (1 + projectionInputs.homeAppreciationRate)

                // Process 12 months of payments
                for (let month = 0; month < 12; month++) {
                    if (currentLoanBalance > 0) {
                        const interestPayment = currentLoanBalance * monthlyRate
                        const principalPayment = Math.min(monthlyPayment - interestPayment, currentLoanBalance)

                        currentLoanBalance -= principalPayment
                        totalInterestPaid += interestPayment
                        totalPrincipalPaid += principalPayment

                        // Extra payments
                        if (projectionInputs.extraPaymentMonthly > 0) {
                            if (projectionInputs.shouldInvestExtra) {
                                // Invest the extra payment instead
                                totalCashInvested += projectionInputs.extraPaymentMonthly
                                currentInvestmentValue += projectionInputs.extraPaymentMonthly
                            } else {
                                // Apply extra payment to principal
                                const extraPrincipal = Math.min(projectionInputs.extraPaymentMonthly, currentLoanBalance)
                                currentLoanBalance -= extraPrincipal
                                totalPrincipalPaid += extraPrincipal
                            }
                        }
                    }
                }

                // Investment growth (compound annually)
                currentInvestmentValue *= (1 + projectionInputs.investmentReturn)
            }

            const homeEquity = currentHomeValue - currentLoanBalance
            const totalEquityBuilt = homeEquity - downPayment

            projections.push({
                year,
                homeValue: currentHomeValue,
                loanBalance: Math.max(0, currentLoanBalance),
                homeEquity,
                totalEquityBuilt,
                investmentValue: currentInvestmentValue,
                cashInvested: totalCashInvested,
                totalNetWorth: homeEquity + currentInvestmentValue + derivedResults.cash_remaining,
                monthlyPayment,
                totalInterestPaid,
                totalPrincipalPaid,
                annualSalary: currentAnnualSalary,
                monthlyIncome: currentAnnualSalary / 12
            })
        }

        return projections
    }

    // Calculate projections for each scenario
    const scenarioProjections = scenarios.map(scenario => {
        // Derive missing properties based on available scenario data
        const homePrice = scenario.homePrice || variables.h_price.value
        const downPayment = scenario.downPayment || homePrice * variables.dp_pct.value
        const loanAmount = scenario.loanAmount || homePrice - downPayment

        // Calculate monthly payment if not provided
        let monthlyPayment = scenario.monthlyPayment
        if (!monthlyPayment) {
            const r = variables.i_yr.value / 12
            const n = variables.t_yrs.value * 12
            const pi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
            const tax = homePrice * variables.pt_rate.value / 12
            const ins = homePrice * variables.hi_rate.value / 12
            const pmi = (downPayment / homePrice) < 0.2 ? (loanAmount * 0.01) / 12 : 0
            monthlyPayment = pi + tax + ins + pmi + variables.upkeep_costs.value
        }

        const projections = calculateProjections(
            homePrice,
            downPayment,
            loanAmount,
            monthlyPayment
        )
        return {
            ...scenario,
            homePrice,
            downPayment,
            loanAmount,
            monthlyPayment,
            projections
        }
    })

    // Get current scenario projections
    const currentProjections = calculateProjections(
        variables.h_price.value,
        derivedResults.down_pmt,
        derivedResults.loan,
        derivedResults.piti
    )

    const updateProjectionInput = (key, value) => {
        setProjectionInputs(prev => ({ ...prev, [key]: value }))
    }

    // Chart data preparation
    const chartData = currentProjections.map(p => ({
        year: p.year,
        "Home Value": p.homeValue,
        "Home Equity": p.homeEquity,
        "Loan Balance": p.loanBalance,
        "Investment Value": p.investmentValue,
        "Total Net Worth": p.totalNetWorth
    }))

    const comparisonData = projectionInputs.timeHorizon <= 15 ?
        scenarioProjections.map(scenario => {
            const finalYear = scenario.projections[projectionInputs.timeHorizon]
            return {
                name: scenario.name,
                "Home Equity": finalYear.homeEquity,
                "Investment Value": finalYear.investmentValue,
                "Total Net Worth": finalYear.totalNetWorth,
                "Total Equity Built": finalYear.totalEquityBuilt
            }
        }) : []

    return (
        <div className="space-y-6">
            {/* Projection Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Time Horizon Analysis Settings
                    </CardTitle>
                    <CardDescription>
                        Configure assumptions for long-term financial projections
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={["assumptions"]} className="w-full">
                        <AccordionItem value="assumptions">
                            <AccordionTrigger className="text-sm font-semibold">Projection Assumptions</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Time Horizon (Years)</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            How far into the future to project
                                        </div>
                                        <Select value={projectionInputs.timeHorizon.toString()} onValueChange={(value) => updateProjectionInput('timeHorizon', parseInt(value))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 Years</SelectItem>
                                                <SelectItem value="10">10 Years</SelectItem>
                                                <SelectItem value="15">15 Years</SelectItem>
                                                <SelectItem value="20">20 Years</SelectItem>
                                                <SelectItem value="30">30 Years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Home Appreciation Rate</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            How much your home value grows each year
                                        </div>
                                        <div className="space-y-2">
                                            <Slider
                                                value={[projectionInputs.homeAppreciationRate * 100]}
                                                onValueChange={(value) => updateProjectionInput('homeAppreciationRate', value[0] / 100)}
                                                max={8}
                                                min={0}
                                                step={0.1}
                                            />
                                            <div className="text-sm text-muted-foreground text-center">
                                                {formatPercent(projectionInputs.homeAppreciationRate)} annually
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Investment Return Rate</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            Expected return on your investments (stocks, bonds, etc.)
                                        </div>
                                        <div className="space-y-2">
                                            <Slider
                                                value={[projectionInputs.investmentReturn * 100]}
                                                onValueChange={(value) => updateProjectionInput('investmentReturn', value[0] / 100)}
                                                max={12}
                                                min={3}
                                                step={0.1}
                                            />
                                            <div className="text-sm text-muted-foreground text-center">
                                                {formatPercent(projectionInputs.investmentReturn)} annually
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Salary Growth Rate</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            How much your income increases each year
                                        </div>
                                        <div className="space-y-2">
                                            <Slider
                                                value={[projectionInputs.salaryGrowthRate * 100]}
                                                onValueChange={(value) => updateProjectionInput('salaryGrowthRate', value[0] / 100)}
                                                max={6}
                                                min={0}
                                                step={0.1}
                                            />
                                            <div className="text-sm text-muted-foreground text-center">
                                                {formatPercent(projectionInputs.salaryGrowthRate)} annually
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wallet className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Extra Monthly Payment</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            Additional money to put toward mortgage or investments
                                        </div>
                                        <Input
                                            type="number"
                                            value={projectionInputs.extraPaymentMonthly}
                                            onChange={(e) => updateProjectionInput('extraPaymentMonthly', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="text-base"
                                        />
                                    </div>

                                    <div className="p-3 border rounded-lg bg-white/50 border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calculator className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm font-medium">Investment Strategy</Label>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-1 mb-2">
                                            What to do with extra money each month
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={projectionInputs.shouldInvestExtra}
                                                onChange={(e) => updateProjectionInput('shouldInvestExtra', e.target.checked)}
                                            />
                                            <span className="text-sm">Invest extra instead of paying down mortgage</span>
                                        </div>
                                    </div>

                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            {/* Current Scenario Projections */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Current Scenario: {projectionInputs.timeHorizon}-Year Projections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="equity">Equity Growth</TabsTrigger>
                            <TabsTrigger value="comparison">ROI Analysis</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="year" />
                                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Home Value" stroke="#8884d8" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Home Equity" stroke="#82ca9d" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Loan Balance" stroke="#ff7c7c" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Investment Value" stroke="#ffc658" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </TabsContent>

                        <TabsContent value="equity" className="space-y-4">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="year" />
                                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Area type="monotone" dataKey="Home Equity" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                                        <Area type="monotone" dataKey="Investment Value" stackId="1" stroke="#ffc658" fill="#ffc658" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </TabsContent>

                        <TabsContent value="comparison" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">💰 What You'll Own</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {(() => {
                                            const finalYear = currentProjections[projectionInputs.timeHorizon]
                                            const totalInvested = derivedResults.down_pmt + finalYear.totalPrincipalPaid + finalYear.cashInvested
                                            const annualizedReturn = Math.pow(finalYear.totalNetWorth / totalInvested, 1 / projectionInputs.timeHorizon) - 1

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span>🏠 Home Worth:</span>
                                                        <span className="font-medium">{formatCurrency(finalYear.homeValue)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>💰 Your Home Equity:</span>
                                                        <span className="font-medium text-green-600">{formatCurrency(finalYear.homeEquity)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>📈 Investment Portfolio:</span>
                                                        <span className="font-medium text-blue-600">{formatCurrency(finalYear.investmentValue)}</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between">
                                                        <span>🎯 Total Net Worth:</span>
                                                        <span className="font-bold text-lg">{formatCurrency(finalYear.totalNetWorth)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>💸 Total Money You Put In:</span>
                                                        <span className="font-medium">{formatCurrency(totalInvested)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>📊 Annual Return Rate:</span>
                                                        <span className={`font-medium ${annualizedReturn > 0.05 ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {formatPercent(annualizedReturn)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">💸 Money In vs Money Out</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {(() => {
                                            const finalYear = currentProjections[projectionInputs.timeHorizon]
                                            const totalInterestPaid = finalYear.totalInterestPaid
                                            const totalPrincipalPaid = finalYear.totalPrincipalPaid
                                            const totalHousingPayments = derivedResults.piti * 12 * projectionInputs.timeHorizon
                                            const totalEarned = finalYear.annualSalary * projectionInputs.timeHorizon

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span>💵 Total Earned ({projectionInputs.timeHorizon} years):</span>
                                                        <span className="font-medium text-green-600">{formatCurrency(totalEarned)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>🏠 Total Housing Payments:</span>
                                                        <span className="font-medium text-red-600">{formatCurrency(totalHousingPayments)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>💸 Interest (money lost to bank):</span>
                                                        <span className="font-medium text-red-600">{formatCurrency(totalInterestPaid)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>🏠 Principal (builds your equity):</span>
                                                        <span className="font-medium text-green-600">{formatCurrency(totalPrincipalPaid)}</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between">
                                                        <span>📈 Monthly Income (final year):</span>
                                                        <span className="font-medium">{formatCurrency(finalYear.monthlyIncome)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>🏠 Housing % of Income (final year):</span>
                                                        <span className="font-medium">
                                                            {formatPercent(derivedResults.piti / finalYear.monthlyIncome)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Enhanced Scenario Comparison */}
            {scenarios.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Target className="h-5 w-5 mr-2" />
                            Scenario Comparison: {projectionInputs.timeHorizon}-Year Outcomes
                        </CardTitle>
                        <CardDescription>
                            Compare long-term financial outcomes across different scenarios
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Scenario Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {scenarioProjections.map((scenario) => {
                                    const finalYear = scenario.projections[projectionInputs.timeHorizon]
                                    const isExpanded = expandedScenario === "all" || expandedScenario === scenario.id
                                    const totalInvested = scenario.downPayment + finalYear.totalPrincipalPaid + finalYear.cashInvested
                                    const totalReturn = finalYear.totalNetWorth - derivedResults.cash_remaining
                                    const annualizedReturn = Math.pow(totalReturn / totalInvested, 1 / projectionInputs.timeHorizon) - 1

                                    return (
                                        <Card key={scenario.id} className={`cursor-pointer transition-all ${selectedScenario === scenario.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant={
                                                        scenario.name.toLowerCase().includes('conservative') ? 'default' :
                                                            scenario.name.toLowerCase().includes('moderate') ? 'secondary' : 'outline'
                                                    }>
                                                        {scenario.name}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                                                    >
                                                        {isExpanded ? 'Less' : 'More'}
                                                    </Button>
                                                </div>
                                                <CardTitle className="text-lg">{formatCurrency(finalYear.totalNetWorth)}</CardTitle>
                                                <CardDescription>Total Net Worth in {projectionInputs.timeHorizon} years</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {/* Key Metrics */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground">Total Home Equity</span>
                                                        <span className="font-medium">{formatCurrency(finalYear.homeEquity)}</span>
                                                        <span className="text-xs text-muted-foreground">Home value minus loan</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground">Investment Portfolio</span>
                                                        <span className="font-medium">{formatCurrency(finalYear.investmentValue)}</span>
                                                        <span className="text-xs text-muted-foreground">Stocks, bonds, etc.</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground">Equity Gained</span>
                                                        <span className="font-medium text-green-600">{formatCurrency(finalYear.totalEquityBuilt)}</span>
                                                        <span className="text-xs text-muted-foreground">Above your down payment</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground">Annual Return</span>
                                                        <span className={`font-medium ${annualizedReturn > 0.05 ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {formatPercent(annualizedReturn)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">On total invested</span>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="space-y-4 pt-4 border-t">
                                                        {/* Money In vs Money Out */}
                                                        <div>
                                                            <h5 className="font-medium mb-2 text-blue-600">💰 Cash Flow Summary</h5>
                                                            <div className="space-y-1 text-sm">
                                                                {(() => {
                                                                    const totalEarned = finalYear.annualSalary * projectionInputs.timeHorizon
                                                                    const totalHousingPayments = scenario.monthlyPayment * 12 * projectionInputs.timeHorizon
                                                                    const totalCashOut = scenario.downPayment + totalHousingPayments
                                                                    const netCashFlow = totalEarned - totalCashOut

                                                                    return (
                                                                        <>
                                                                            <div className="flex justify-between">
                                                                                <span>💵 Total Earnings ({projectionInputs.timeHorizon} years):</span>
                                                                                <span className="font-medium text-green-600">{formatCurrency(totalEarned)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>🏠 Total Housing Payments:</span>
                                                                                <span className="font-medium text-red-600">{formatCurrency(totalHousingPayments)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>💸 Down Payment (upfront):</span>
                                                                                <span className="font-medium text-red-600">{formatCurrency(scenario.downPayment)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between font-medium border-t pt-1">
                                                                                <span>Net Cash Flow:</span>
                                                                                <span className={netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                                    {formatCurrency(netCashFlow)}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>

                                                        <Separator />

                                                        {/* What You Own */}
                                                        <div>
                                                            <h5 className="font-medium mb-2 text-green-600">🏡 What You Own</h5>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span>🏠 Home Worth:</span>
                                                                    <span className="font-medium">{formatCurrency(finalYear.homeValue)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>💰 Your Equity (home value - loan):</span>
                                                                    <span className="font-medium text-green-600">{formatCurrency(finalYear.homeEquity)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>📈 Investment Portfolio:</span>
                                                                    <span className="font-medium text-blue-600">{formatCurrency(finalYear.investmentValue)}</span>
                                                                </div>
                                                                <div className="flex justify-between font-medium border-t pt-1">
                                                                    <span>Total Net Worth:</span>
                                                                    <span className="text-lg">{formatCurrency(finalYear.totalNetWorth)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Separator />

                                                        {/* What You Still Owe */}
                                                        <div>
                                                            <h5 className="font-medium mb-2 text-orange-600">💳 What You Still Owe</h5>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span>🏦 Remaining Mortgage:</span>
                                                                    <span className="font-medium text-red-600">{formatCurrency(finalYear.loanBalance)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>💸 Interest Paid So Far:</span>
                                                                    <span className="font-medium text-red-600">{formatCurrency(finalYear.totalInterestPaid)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>🏠 Principal Paid So Far:</span>
                                                                    <span className="font-medium text-green-600">{formatCurrency(finalYear.totalPrincipalPaid)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Separator />

                                                        {/* Return on Investment */}
                                                        <div>
                                                            <h5 className="font-medium mb-2 text-purple-600">📊 How Well Your Money Worked</h5>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span>💰 Total Money Put In:</span>
                                                                    <span className="font-medium">{formatCurrency(totalInvested)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>📈 What It's Worth Now:</span>
                                                                    <span className="font-medium">{formatCurrency(finalYear.totalNetWorth)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>🎯 Annual Return Rate:</span>
                                                                    <span className={`font-medium ${annualizedReturn > 0.05 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                        {formatPercent(annualizedReturn)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>🚀 Money Multiplier:</span>
                                                                    <span className="font-medium">
                                                                        {(finalYear.totalNetWorth / totalInvested).toFixed(2)}x
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant={selectedScenario === scenario.id ? "default" : "outline"}
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => onScenarioSelect(scenario.id)}
                                                    >
                                                        {selectedScenario === scenario.id ? 'Selected' : 'Select'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>

                            {/* Comparison Chart */}
                            {projectionInputs.timeHorizon <= 15 && comparisonData.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-lg font-medium mb-4">Scenario Comparison Chart</h4>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={comparisonData}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="none"
                                                    stroke="#e0e0e0"
                                                    horizontal={true}
                                                    vertical={false}
                                                />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={true}
                                                    tickLine={true}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                                    axisLine={true}
                                                    tickLine={true}
                                                />
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                                <Legend />
                                                <Bar dataKey="Home Equity" fill="#82ca9d" stroke="#82ca9d" strokeWidth={1} />
                                                <Bar dataKey="Investment Value" fill="#ffc658" stroke="#ffc658" strokeWidth={1} />
                                                <Bar dataKey="Total Net Worth" fill="#8884d8" stroke="#8884d8" strokeWidth={2} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="text-sm text-muted-foreground text-center mt-2">
                                        💡 Each scenario shows your projected wealth after {projectionInputs.timeHorizon} years
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
} 