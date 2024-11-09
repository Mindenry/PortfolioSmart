import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code, Palette, Brain, ExternalLink } from 'lucide-react';
interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  image_url: string;
  tags: string[];
}
export default function Home() {
  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "Smart Projects",
      description: "Discover my collection of innovative projects with detailed insights and live demos."
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Adaptive Design",
      description: "Experience seamless transitions between light and dark modes with stunning UI effects."
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Recommendations",
      description: "Get personalized project recommendations based on your interests and browsing patterns."
    }
  ];
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };
  const { data: latestProjects } = useQuery({
    queryKey: ["latest-projects"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8080/api/projects?limit=3");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json() as Promise<Project[]>;
    },
  });
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative isolate">
        {/* Background Effects */}
        <div className="absolute inset-x-0 top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.h1 
              variants={itemVariants}
              className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent"
            >
              Smart Portfolio Website
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto"
            >
              Discover a collection of innovative projects enhanced with AI-powered recommendations, 
              creating a unique and personalized experience for every visitor.
            </motion.p>
            <motion.div 
              variants={itemVariants}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              <Button size="lg" className="group">
                View Projects
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="ghost" size="lg">
                Learn More
              </Button>
            </motion.div>
          </motion.div>
          {/* About/Services Banner */}
          <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 py-16 mt-20">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-4">About Me</h2>
                  <p className="text-muted-foreground mb-6">
                    I'm a passionate developer focused on creating innovative solutions using modern technologies.
                    With expertise in full-stack development, I bring ideas to life through clean code and intuitive design.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/about">Learn More About Me <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Frontend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">React, Next.js, Tailwind CSS</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Backend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Node.js, Express, PostgreSQL</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
          {/* Latest Projects */}
          <section className="py-16">
            <div className="container mx-auto px-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Latest Projects</h2>
                <Button asChild variant="ghost">
                  <Link to="/projects">View All Projects <ExternalLink className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {latestProjects?.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                      <img
                        src={project.image_url || "https://via.placeholder.com/400x300"}
                        alt={project.title}
                        className="w-full h-48 object-cover"
                      />
                      <CardContent className="p-4">
                        <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{project.category}</Badge>
                          {project.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
          {/* Features Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
              >
                <Card className="p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-105 bg-background/50 backdrop-blur-sm border border-border/50">
                  <div className="rounded-full w-12 h-12 bg-primary/10 flex items-center justify-center mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
        {/* Bottom Background Effect */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </div>
    </div>
  );
}