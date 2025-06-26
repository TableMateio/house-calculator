import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ScenarioComparison({ inputs, derived, thresholds, formatPercent, formatCurrency }) {
  // Calculate approval status for each scenario
  const scenarios = ["conservative", "moderate", "aggressive"]

  const getScenarioStatus = (scenario) => {
    const frontEndPass = derived.front_end <= thresholds[scenario].front_end
    const backEndPass = derived.back_end <= thresholds[scenario].back_end
    const overallPass = frontEndPass && backEndPass && derived.cash_pass

    return {
      frontEndPass,
      backEndPass,
      overallPass,
    }
  }

  const scenarioStatuses = {
    conservative: getScenarioStatus("conservative"),
    moderate: getScenarioStatus("moderate"),
    aggressive: getScenarioStatus("aggressive"),
  }

  // Calculate max home price for each scenario
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
    // maxPiti = loan * paymentFactor + price * taxInsPct + loan * pmiPct
    // maxPiti = loan * paymentFactor + loan / (1 - dp_pct) * taxInsPct + loan * pmiPct
    // maxPiti = loan * (paymentFactor + taxInsPct / (1 - dp_pct) + pmiPct)

    const combinedFactor = paymentFactor + taxInsPct / (1 - inputs.dp_pct) + pmiPct * (1 - inputs.dp_pct)
    const maxLoan = maxPiti / combinedFactor

    // Convert to max price
    const maxPrice = maxLoan / (1 - inputs.dp_pct)

    return maxPrice
  }

  const maxHomePrices = {
    conservative: calculateMaxHomePrice("conservative"),
    moderate: calculateMaxHomePrice("moderate"),
    aggressive: calculateMaxHomePrice("aggressive"),
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Comparison</CardTitle>
        <CardDescription>See how your numbers stack up against different approval scenarios</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableHead>Housing Ratio</TableHead>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Housing Ratio is your monthly housing payment (PITI) divided by your monthly income. Conservative:
                      ≤28%, Moderate: ≤33%, Aggressive: ≤40%
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableHead>Total DTI</TableHead>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Total Debt-to-Income (DTI) is your monthly housing payment plus other debt payments divided by
                      your monthly income. Conservative: ≤36%, Moderate: ≤43%, Aggressive: ≤45%
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableHead>Max Home Price</TableHead>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The maximum home price you could afford based on your income, debts, and the selected scenario's
                      thresholds
                    </p>
                  </TooltipContent>
                </Tooltip>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => (
                <TableRow key={scenario} className={inputs.scenario === scenario ? "bg-muted/50" : ""}>
                  <TableCell className="font-medium capitalize">
                    {scenario === "conservative" && "Conservative (28/36%)"}
                    {scenario === "moderate" && "Moderate (33/43%)"}
                    {scenario === "aggressive" && "Aggressive (40/45%)"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className={scenarioStatuses[scenario].frontEndPass ? "text-green-600" : "text-red-600"}>
                        {formatPercent(derived.front_end)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">
                        (Max: {formatPercent(thresholds[scenario].front_end)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className={scenarioStatuses[scenario].backEndPass ? "text-green-600" : "text-red-600"}>
                        {formatPercent(derived.back_end)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">
                        (Max: {formatPercent(thresholds[scenario].back_end)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(maxHomePrices[scenario])}</TableCell>
                  <TableCell>
                    {scenarioStatuses[scenario].overallPass ? (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
