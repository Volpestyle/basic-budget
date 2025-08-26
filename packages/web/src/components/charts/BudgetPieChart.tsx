import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { categoriesAtom } from '../../store/atoms';
import { Card, CardHeader, CardContent } from '../ui/Card';
import styles from './Charts.module.css';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; color: string } }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{data.payload.name}</p>
        <p className={styles.tooltipValue}>
          ${data.value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface BudgetPieChartProps {
  type: 'income' | 'expense';
}

export const BudgetPieChart: React.FC<BudgetPieChartProps> = ({ type }) => {
  const [categories] = useAtom(categoriesAtom);
  
  const filteredCategories = categories.filter(c => c.type === type);
  const data = filteredCategories.map(c => ({
    name: c.name,
    value: c.budgeted,
    color: c.color,
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card variant="elevated">
      <CardHeader
        title={type === 'income' ? 'Income Breakdown' : 'Expense Breakdown'}
        subtitle={`Total: $${total.toLocaleString()}`}
      />
      <CardContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className={styles.chartContainer}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: 'var(--color-text-primary)' }}
                formatter={(value) => <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
};