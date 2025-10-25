import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface CTAButton {
  to: string;
  text: string;
  variant?: 'default' | 'outline';
  className?: string;
}

interface AnimatedCTAButtonsProps {
  buttons: CTAButton[];
}

const AnimatedCTAButtons: React.FC<AnimatedCTAButtonsProps> = ({ buttons }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 1.5
      }
    }
  };

  const buttonVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 12
      }
    }
  };

  return (
    <motion.div
      className="flex flex-col sm:flex-row gap-4 justify-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {buttons.map((button, index) => (
        <motion.div
          key={index}
          variants={buttonVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Link to={button.to}>
            <Button 
              size="lg" 
              variant={button.variant || "default"}
              className={button.className || "text-lg px-8 py-4 shadow-lg"}
            >
              {button.text}
            </Button>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedCTAButtons;










