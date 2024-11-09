import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Project } from "@/types/project";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: number;
  name: string;
  description: string;
}

interface ProjectFormProps {
  formData: Partial<Project>;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

export function ProjectForm({ formData, onSubmit, onChange, onCancel, isEdit }: ProjectFormProps) {
  const { toast } = useToast();
  
  const { data: categories = [], isError } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      return response.json();
    }
  });

  if (isError) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load categories",
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-background p-4 rounded-lg border">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          required
          className="bg-background"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          required
          className="bg-background"
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category_id?.toString() || ''}
          onValueChange={(value) => onChange('category_id', value)}
          required
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={formData.image_url || ''}
          onChange={(e) => onChange('image_url', e.target.value)}
          className="bg-background"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}