import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="container mx-auto px-4 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Welcome to Our Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Start exploring our amazing features and services
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Feature 1</h3>
            <p className="text-gray-600">Description of feature 1</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Feature 2</h3>
            <p className="text-gray-600">Description of feature 2</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Feature 3</h3>
            <p className="text-gray-600">Description of feature 3</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;