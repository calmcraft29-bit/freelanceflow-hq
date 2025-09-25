import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';

interface ProjectProgressCardProps {
  project: any;
  progress: number;
}

const ProjectProgressCard: React.FC<ProjectProgressCardProps> = ({ project, progress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on_hold': return 'destructive';
      default: return 'outline';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const completedTasks = project.tasks.filter((t: any) => t.status === 'done').length;
  const totalTasks = project.tasks.length;
  const pendingTasks = project.tasks.filter((t: any) => t.status === 'pending').length;
  const inProgressTasks = project.tasks.filter((t: any) => t.status === 'in-progress').length;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description || 'No description provided'}
            </p>
          </div>
          <Badge variant={getStatusColor(project.status)}>
            {project.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className={`text-sm font-bold ${getProgressColor(progress)}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 dark:bg-green-950 p-2 rounded-lg">
            <div className="text-lg font-bold text-green-600">{completedTasks}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 p-2 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{inProgressTasks}</div>
            <div className="text-xs text-yellow-600">In Progress</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 p-2 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{pendingTasks}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {project.start_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started:</span>
              <span className="font-medium">
                {new Date(project.start_date).toLocaleDateString()}
              </span>
            </div>
          )}
          {project.end_date && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className="font-medium">
                {new Date(project.end_date).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-medium">{totalTasks} total</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">
              {project.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectProgressCard;