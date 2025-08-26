import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { categoriesAtom } from '../../store/atoms';
import { Card, CardHeader, CardContent } from '../ui/Card';
import styles from './Charts.module.css';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((item, index) => (
          <p key={index} className={styles.tooltipValue}>
            {item.dataKey}: ${item.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const BudgetBarChart: React.FC = () => {
  const [categories] = useAtom(categoriesAtom);
  
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const data = expenseCategories.map(c => ({
    name: c.name,
    budgeted: c.budgeted,
    actual: c.actual,
    color: c.color,
  }));

  return (
    <Card variant="elevated">
      <CardHeader
        title="Budget vs Actual Spending"
        subtitle="Track your spending against your budget"
      />
      <CardContent>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className={styles.chartContainer}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--color-text-secondary)"
                tick={{ fill: 'var(--color-text-secondary)' }}
              />
              <YAxis 
                stroke="var(--color-text-secondary)"
                tick={{ fill: 'var(--color-text-secondary)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: 'var(--color-text-primary)' }}
                formatter={(value) => <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>}
              />
              <Bar 
                dataKey="budgeted" 
                fill="var(--color-accent-primary)"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
              />
              <Bar 
                dataKey="actual" 
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.actual > entry.budgeted ? 'var(--color-accent-danger)' : 'var(--color-accent-success)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
};