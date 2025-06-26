import DynamicCalculator from "@/components/dynamic-calculator"

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Dynamic Home Buying Calculator</h1>
      <p className="text-center mb-8 text-muted-foreground max-w-2xl mx-auto">
        A smarter way to explore home buying scenarios. Lock any variable to solve for it - whether that's max house price,
        monthly payment, down payment amount, or cash remaining after purchase.
      </p>
      <DynamicCalculator />
    </div>
  )
}
