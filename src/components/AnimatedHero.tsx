import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface AnimatedHeroProps {
  badge?: string;
  title: string;
  subtitle: string;
  description: string;
}

const AnimatedHero: React.FC<AnimatedHeroProps> = ({
  badge = "🇰🇪 Kujenga Pamoja - Building Together Across Kenya",
  title,
  subtitle,
  description
}) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Badge */}
      <motion.div variants={badgeVariants} className="mb-4 flex justify-center">
        <Badge className="mb-4 bg-kenyan-green text-white border-kenyan-green">
          {badge}
        </Badge>
      </motion.div>

      {/* Title with word-by-word animation */}
      <motion.h1 
        className="text-5xl font-bold mb-6 leading-tight"
        variants={itemVariants}
      >
        <motion.span 
          className="text-text-on-dark inline-block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Jenga,{' '}
        </motion.span>
        <motion.span 
          className="text-acacia-gold inline-block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Unganisha,{' '}
        </motion.span>
        <motion.span 
          className="text-text-on-dark inline-block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          na{' '}
        </motion.span>
        <motion.span 
          className="text-kenyan-green inline-block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          Stawi Pamoja
        </motion.span>
      </motion.h1>

      {/* Subtitle */}
      <motion.div 
        className="text-2xl font-medium mb-4 text-acacia-gold"
        variants={itemVariants}
      >
        {subtitle}
      </motion.div>

      {/* Description */}
      <motion.p 
        className="text-xl text-text-secondary-light mb-8 max-w-2xl mx-auto drop-shadow-lg"
        variants={itemVariants}
      >
        {description}
      </motion.p>
    </motion.div>
  );
};

export default AnimatedHero;





