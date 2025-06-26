import MortgageCalculator from "@/components/mortgage-calculator"

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Home Buying Scenario Calculator</h1>
      <p className="text-center mb-8 text-muted-foreground max-w-2xl mx-auto">
        Adjust the inputs to see how different scenarios affect your mortgage approval chances and financial outlook.
      </p>
      <MortgageCalculator />
    </div>
  )
}
