import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Mail } from "lucide-react";

const About = () => {
  return (
    <div className="container mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-4xl mx-auto p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-48 h-48 rounded-full overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">About Me</h1>
              <p className="text-lg text-muted-foreground mb-6">
                I'm a passionate developer with expertise in building modern web applications.
                My focus is on creating intuitive and performant user experiences using
                cutting-edge technologies.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" size="icon">
                  <Github className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon">
                  <Linkedin className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon">
                  <Mail className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Skills & Technologies</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                "React",
                "Node.js",
                "TypeScript",
                "PostgreSQL",
                "Tailwind CSS",
                "Express.js",
              ].map((skill) => (
                <Card
                  key={skill}
                  className="p-4 text-center hover:shadow-md transition-shadow"
                >
                  {skill}
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default About;