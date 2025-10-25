import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnimatedFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

const AnimatedFeatureCard: React.FC<AnimatedFeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  index
}) => {
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 50,
      rotateX: -15
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.1
      }
    }
  };

  const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.2, 
      rotate: 360,
      transition: { 
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ 
        y: -10,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
      }}
      transition={{ duration: 0.3 }}
    >
      <Card className="text-center h-full border-border group cursor-pointer">
        <CardHeader>
          <motion.div 
            className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit"
            variants={iconVariants}
            initial="initial"
            whileHover="hover"
          >
            <Icon className="h-6 w-6 text-primary-foreground" />
          </motion.div>
          <CardTitle className="text-lg text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnimatedFeatureCard;










