import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  category_id: number;
  tags: string[];
  status: 'draft' | 'published';
  meta_title: string;
  meta_description: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

export default function BlogManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    status: 'draft',
    tags: []
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blog posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8080/api/blog-posts');
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      const data = await response.json();
      return data.map((post: any) => ({
        ...post,
        image_url: post.image_url ? `http://localhost:8080${post.image_url}` : null
      }));
    }
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  const handleImageUpload = async (file: File) => {
    const formDataFile = new FormData();
    formDataFile.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formDataFile
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      const data = await response.json();
      const fullImageUrl = `http://localhost:8080${data.url}`;
      
      setFormData(prev => ({ ...prev, image_url: fullImageUrl }));
      setImagePreview(URL.createObjectURL(file));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload image",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedPost 
        ? `http://localhost:8080/api/blog-posts/${selectedPost.id}`
        : 'http://localhost:8080/api/blog-posts';
        
      const method = selectedPost ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_url: formData.image_url?.replace('http://localhost:8080', '')
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedPost ? 'update' : 'create'} blog post`);
      }

      toast({
        title: "Success",
        description: `Blog post ${selectedPost ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setSelectedPost(null);
      setFormData({ status: 'draft', tags: [] });
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${selectedPost ? 'update' : 'create'} blog post`,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const response = await fetch(`http://localhost:8080/api/blog-posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete blog post');
      }

      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete blog post",
      });
    }
  };

  if (postsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Blog Management
          </h1>
          <p className="text-muted-foreground mt-2">Create and manage your blog posts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-purple-600">
              <Plus className="mr-2 h-4 w-4" /> Add Blog Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPost ? 'Edit Blog Post' : 'Add New Blog Post'}
              </DialogTitle>
              <DialogDescription>
                {selectedPost ? 'Edit the blog post details below' : 'Fill in the blog post details below'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category_id?.toString()}
                        onValueChange={(value) => setFormData({ ...formData, category_id: parseInt(value) })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Excerpt</Label>
                    <Textarea
                      value={formData.excerpt || ''}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      className="mt-1.5 min-h-[200px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    {imagePreview || formData.image_url ? (
                      <div className="space-y-4">
                        <img
                          src={imagePreview || formData.image_url}
                          alt="Preview"
                          className="mx-auto max-h-[200px] rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 flex flex-col items-center justify-center gap-2"
                      >
                        <Upload className="h-8 w-8" />
                        <span>Click to upload image</span>
                      </Button>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label>Meta Title</Label>
                    <Input
                      value={formData.meta_title || ''}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label>Meta Description</Label>
                    <Textarea
                      value={formData.meta_description || ''}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      })}
                      className="mt-1.5"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedPost(null);
                  setFormData({ status: 'draft', tags: [] });
                  setImagePreview(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-purple-600">
                  {selectedPost ? 'Update' : 'Create'} Blog Post
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post: BlogPost) => (
          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="relative aspect-video">
              <img
                src={post.image_url || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge 
                variant={post.status === 'published' ? 'default' : 'secondary'}
                className="absolute top-2 right-2"
              >
                {post.status}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg truncate mb-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {post.excerpt}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPost(post);
                      setFormData(post);
                      setIsDialogOpen(true);
                    }}
                    className="hover:scale-105 transition-transform"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(post.id)}
                    className="hover:scale-105 transition-transform"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}