import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Home, DollarSign, PieChart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function KeyMetricsDashboard({ derived, inputs, thresholds, formatCurrency, formatPercent }) {
    // Calculate overall approval status
    const frontEndPass = derived.front_end <= thresholds.moderate.front_end
    const backEndPass = derived.back_end <= thresholds.moderate.back_end
    const cashPass = derived.cash_pass
    const overallPass = frontEndPass && backEndPass && cashPass

    // Get net worth scenario
    const getNetWorthScenario = () => {
        if (derived.equity_pct_of_nw <= thresholds.conservative.net_worth) return "conservative"
        if (derived.equity_pct_of_nw <= thresholds.moderate.net_worth) return "moderate"
        if (derived.equity_pct_of_nw <= thresholds.aggressive.net_worth) return "aggressive"
        return "high risk"
    }

    const netWorthScenario = getNetWorthScenario()

    // Get color coding for different metrics
    const getStatusColor = (pass) => pass ? "text-green-600" : "text-red-600"
    const getStatusIcon = (pass) => pass ? CheckCircle : XCircle
    const getStatusBg = (pass) => pass ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"

    const getNetWorthColor = () => {
        switch (netWorthScenario) {
            case "conservative": return "text-green-600"
            case "moderate": return "text-blue-600"
            case "aggressive": return "text-orange-600"
            default: return "text-red-600"
        }
    }

    return (
        <Card className={`border-2 ${overallPass ? "border-green-500" : "border-red-500"}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Key Metrics Dashboard</CardTitle>
                    <Badge variant={overallPass ? "success" : "destructive"} className="text-sm">
                        {overallPass ? "LIKELY APPROVED" : "NEEDS WORK"}
                    </Badge>
                </div>
                <CardDescription>Your most important numbers at a glance</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Monthly Payment */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="bg-muted/50 p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                        <Home className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-2xl font-bold">{formatCurrency(derived.piti)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">Monthly Payment</div>
                                    <div className="text-xs mt-1">
                                        {formatPercent(derived.front_end)} of income
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Your total monthly housing payment (PITI)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Cash Required */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`p-4 rounded-lg border ${getStatusBg(cashPass)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-2xl font-bold">{formatCurrency(derived.total_cash_needed)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">Cash Required</div>
                                    <div className={`text-xs mt-1 flex items-center ${getStatusColor(cashPass)}`}>
                                        {React.createElement(getStatusIcon(cashPass), { className: "h-3 w-3 mr-1" })}
                                        {cashPass ? "Sufficient cash" : "Need more cash"}
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Down payment + closing costs + reserves</p>
                                <p>Available: {formatCurrency(inputs.cash_avail)}</p>
                                <p>Remaining: {formatCurrency(derived.cash_remaining)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* DTI Ratio */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`p-4 rounded-lg border ${getStatusBg(backEndPass)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-2xl font-bold">{formatPercent(derived.back_end)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total DTI</div>
                                    <div className={`text-xs mt-1 flex items-center ${getStatusColor(backEndPass)}`}>
                                        {React.createElement(getStatusIcon(backEndPass), { className: "h-3 w-3 mr-1" })}
                                        Max: {formatPercent(thresholds.moderate.back_end)}
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Total debt-to-income ratio</p>
                                <p>Includes housing payment + other debts</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Net Worth Impact */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="bg-muted/50 p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                        <PieChart className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-2xl font-bold">{formatPercent(derived.equity_pct_of_nw)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">Net Worth in Home</div>
                                    <div className={`text-xs mt-1 ${getNetWorthColor()}`}>
                                        {netWorthScenario} allocation
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Percentage of net worth tied up in home equity</p>
                                <p>Net Worth: {formatCurrency(derived.net_worth)}</p>
                                <p>Home Equity: {formatCurrency(derived.home_equity)}</p>
                                <div className="mt-2 text-xs">
                                    <div>Conservative: ≤ {formatPercent(thresholds.conservative.net_worth)}</div>
                                    <div>Moderate: ≤ {formatPercent(thresholds.moderate.net_worth)}</div>
                                    <div>Aggressive: ≤ {formatPercent(thresholds.aggressive.net_worth)}</div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Action Items */}
                {!overallPass && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                            <span className="font-medium text-orange-800">Action Items to Get Approved:</span>
                        </div>
                        <ul className="text-sm text-orange-700 space-y-1">
                            {!frontEndPass && (
                                <li>• Reduce home price or increase income (Housing ratio: {formatPercent(derived.front_end)} > {formatPercent(thresholds.moderate.front_end)})</li>
                            )}
                            {!backEndPass && (
                                <li>• Pay down other debts or increase income (Total DTI: {formatPercent(derived.back_end)} > {formatPercent(thresholds.moderate.back_end)})</li>
                            )}
                            {!cashPass && (
                                <li>• Need {formatCurrency(derived.total_cash_needed - inputs.cash_avail)} more in available cash</li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Success Summary */}
                {overallPass && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <span className="font-medium text-green-800">You're on track for approval!</span>
                        </div>
                        <div className="text-sm text-green-700">
                            Cash remaining after purchase: {formatCurrency(derived.cash_remaining)} •
                            Layoff survival: {derived.layoff_cash_months.toFixed(1)} months
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any
        }
    }
} 