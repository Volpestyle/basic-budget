import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, DollarSign, TrendingUp, AlertCircle, Edit2, Check, X } from 'lucide-react';
import {
  incomeAtom,
  categoriesAtom,
  totalBudgetedAtom,
  totalSpentAtom,
  remainingAtom,
  budgetRemainingAtom,
  budgetStatusAtom,
  type ExpenseCategory,
} from '@/store/budget';

export function BudgetDashboard() {
  const [income, setIncome] = useAtom(incomeAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [totalBudgeted] = useAtom(totalBudgetedAtom);
  const [totalSpent] = useAtom(totalSpentAtom);
  const [remaining] = useAtom(remainingAtom);
  const [budgetRemaining] = useAtom(budgetRemainingAtom);
  const [budgetStatus] = useAtom(budgetStatusAtom);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(income.toString());

  const pieData = categories.map(cat => ({
    name: cat.name,
    value: cat.budgeted,
    color: cat.color,
  }));

  const barData = categories.map(cat => ({
    name: cat.name,
    budgeted: cat.budgeted,
    spent: cat.spent,
    remaining: Math.max(0, cat.budgeted - cat.spent),
    over: Math.max(0, cat.spent - cat.budgeted),
  }));

  const addCategory = () => {
    if (!newCategoryName || !newCategoryBudget) return;
    
    const newCategory: ExpenseCategory = {
      id: Date.now().toString(),
      name: newCategoryName,
      budgeted: parseFloat(newCategoryBudget),
      spent: 0,
      color: `var(--chart-${(categories.length % 5) + 1})`,
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div 
      className="min-h-screen bg-background p-4 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl font-medium text-foreground">Budget Dashboard</h1>
            <p className="text-muted-foreground">Manage your monthly budget and track expenses</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Badge 
              variant={budgetStatus.isOverBudget ? "destructive" : "default"} 
              className="text-sm px-3 py-1"
            >
              {budgetStatus.isOverBudget ? "Over Budget" : "On Track"}
            </Badge>
          </motion.div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {editingIncome ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <Input
                        type="number"
                        value={tempIncome}
                        onChange={(e) => setTempIncome(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setIncome(parseFloat(tempIncome) || 0);
                          setEditingIncome(false);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setTempIncome(income.toString());
                          setEditingIncome(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between"
                    >
                      <div className="text-2xl font-bold">${income.toLocaleString()}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingIncome(true);
                          setTempIncome(income.toString());
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  key={totalBudgeted}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  ${totalBudgeted.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  {budgetRemaining >= 0 ? `$${budgetRemaining} unallocated` : `$${Math.abs(budgetRemaining)} over income`}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  key={totalSpent}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  ${totalSpent.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  {totalBudgeted > 0 ? `${((totalSpent / totalBudgeted) * 100).toFixed(1)}% of budget used` : 'No budget set'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  key={remaining}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  ${remaining.toLocaleString()}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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
        </motion.div>

        {/* Categories Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Category */}
              <motion.div 
                className="flex items-end space-x-4 p-4 bg-muted/30 rounded-lg"
                whileHover={{ backgroundColor: 'var(--muted)/40' }}
                transition={{ duration: 0.2 }}
              >
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
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button onClick={addCategory} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </motion.div>
              </motion.div>

              {/* Category List */}
              <div className="space-y-4">
                <AnimatePresence>
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <motion.div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                        whileHover={{ scale: 1.2 }}
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
                            <motion.div 
                              className={category.budgeted - category.spent >= 0 ? 'text-green-600' : 'text-red-600'}
                              key={category.budgeted - category.spent}
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              ${(category.budgeted - category.spent).toLocaleString()}
                            </motion.div>
                          </div>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCategory(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}