import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  color: string;
}

const defaultCategories: ExpenseCategory[] = [
  { id: '1', name: 'Housing', budgeted: 1200, spent: 1200, color: 'var(--chart-1)' },
  { id: '2', name: 'Food', budgeted: 400, spent: 320, color: 'var(--chart-2)' },
  { id: '3', name: 'Transportation', budgeted: 300, spent: 280, color: 'var(--chart-3)' },
  { id: '4', name: 'Utilities', budgeted: 200, spent: 180, color: 'var(--chart-4)' },
  { id: '5', name: 'Entertainment', budgeted: 150, spent: 120, color: 'var(--chart-5)' },
];

export function BudgetDashboard() {
  const [income, setIncome] = useState(3500);
  const [categories, setCategories] = useState<ExpenseCategory[]>(defaultCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');

  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const remaining = income - totalSpent;
  const budgetRemaining = income - totalBudgeted;

  const pieData = categories.map(cat => ({
    name: cat.name,
    value: cat.budgeted,
    color: cat.color
  }));

  const barData = categories.map(cat => ({
    name: cat.name,
    budgeted: cat.budgeted,
    spent: cat.spent,
    remaining: Math.max(0, cat.budgeted - cat.spent),
    over: Math.max(0, cat.spent - cat.budgeted)
  }));

  const addCategory = () => {
    if (!newCategoryName || !newCategoryBudget) return;
    
    const newCategory: ExpenseCategory = {
      id: Date.now().toString(),
      name: newCategoryName,
      budgeted: parseFloat(newCategoryBudget),
      spent: 0,
      color: `var(--chart-${(categories.length % 5) + 1})`
    };
    
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryBudget('');
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const updateCategorySpent = (id: string, spent: number) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, spent } : cat
    ));
  };

  const updateCategoryBudget = (id: string, budgeted: number) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, budgeted } : cat
    ));
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Budget Dashboard</h1>
            <p className="text-muted-foreground">Manage your monthly budget and track expenses</p>
          </div>
          <Badge variant={remaining >= 0 ? "default" : "destructive"} className="text-sm px-3 py-1">
            {remaining >= 0 ? "On Track" : "Over Budget"}
          </Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${income.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBudgeted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {budgetRemaining >= 0 ? `$${budgetRemaining} unallocated` : `$${Math.abs(budgetRemaining)} over income`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((totalSpent / totalBudgeted) * 100).toFixed(1)}% of budget used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${remaining.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Budgeted']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budgeted" fill="var(--chart-1)" name="Budgeted" />
                  <Bar dataKey="spent" fill="var(--chart-2)" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Income Setting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Monthly Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Label htmlFor="income" className="w-24">Take-home:</Label>
              <Input
                id="income"
                type="number"
                value={income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                className="w-32"
              />
              <span className="text-muted-foreground">per month</span>
            </div>
          </CardContent>
        </Card>

        {/* Categories Management */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Category */}
            <div className="flex items-end space-x-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="new-category">Category Name</Label>
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Groceries"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="new-budget">Budget Amount</Label>
                <Input
                  id="new-budget"
                  type="number"
                  value={newCategoryBudget}
                  onChange={(e) => setNewCategoryBudget(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={addCategory} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Category List */}
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{category.name}</h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <div>
                        <Label className="text-xs">Budgeted</Label>
                        <Input
                          type="number"
                          value={category.budgeted}
                          onChange={(e) => updateCategoryBudget(category.id, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Spent</Label>
                        <Input
                          type="number"
                          value={category.spent}
                          onChange={(e) => updateCategorySpent(category.id, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8"
                        />
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Remaining</div>
                        <div className={category.budgeted - category.spent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${(category.budgeted - category.spent).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCategory(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}