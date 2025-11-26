<script lang="ts">
  // Dashboard placeholder
</script>

<svelte:head>
  <title>Basic Budget</title>
  <meta name="description" content="A monthly budgeting app that makes it effortless to manage your finances." />
</svelte:head>

<main class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-4xl font-bold text-gradient">Basic Budget</h1>
    <p class="text-white/60 mt-2">Stay on top of your month.</p>
  </header>

  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    <div class="glass p-6">
      <p class="text-white/60 text-sm">Income</p>
      <p class="text-3xl font-mono font-semibold text-primary mt-1">$0.00</p>
    </div>
    <div class="glass p-6">
      <p class="text-white/60 text-sm">Spent</p>
      <p class="text-3xl font-mono font-semibold text-red-400 mt-1">$0.00</p>
    </div>
    <div class="glass p-6">
      <p class="text-white/60 text-sm">Net</p>
      <p class="text-3xl font-mono font-semibold mt-1">$0.00</p>
    </div>
    <div class="glass p-6">
      <p class="text-white/60 text-sm">Remaining</p>
      <p class="text-3xl font-mono font-semibold text-secondary mt-1">100%</p>
    </div>
  </div>

  <section class="mt-8 glass p-6">
    <h2 class="text-xl font-semibold mb-4">Getting Started</h2>
    <p class="text-white/60">Sign in to start tracking your finances.</p>
  </section>
</main>
