import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  sublabel?: string;
  color: string;
}

interface AnimatedStatsGridProps {
  stats: Stat[];
}

const AnimatedStatsGrid: React.FC<AnimatedStatsGridProps> = ({ stats }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 1.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          className="text-center bg-black/20 backdrop-blur-sm rounded-lg p-4 hover:bg-black/30 transition-all duration-300 cursor-pointer"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.08,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className={`text-3xl font-bold ${stat.color} drop-shadow-lg`}>
            <AnimatedCounter end={stat.value} suffix={stat.suffix || ""} />
          </div>
          <div className="text-text-secondary-light drop-shadow-md">{stat.label}</div>
          {stat.sublabel && (
            <motion.div 
              className="text-xs text-text-secondary-light drop-shadow-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.15 + 1.8 }}
            >
              {stat.sublabel}
            </motion.div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedStatsGrid;










