import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, Clock } from 'lucide-react';
import { ManualTimeEntry } from './ManualTimeEntry';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

interface TaskTimerProps {
  task: Task;
  onTaskUpdate: () => void;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({ task, onTaskUpdate }) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (task.is_timer_running && task.start_time) {
      const startTime = new Date(task.start_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setCurrentTime(task.time_spent + elapsed);

      const id = setInterval(() => {
        const current = Date.now();
        const totalElapsed = Math.floor((current - startTime) / 1000);
        setCurrentTime(task.time_spent + totalElapsed);
      }, 1000);

      setIntervalId(id);
    } else {
      setCurrentTime(task.time_spent);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [task.is_timer_running, task.start_time, task.time_spent]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_timer_running: true,
          start_time: new Date().toISOString(),
          status: task.status === 'pending' ? 'in-progress' : task.status,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Timer Started",
        description: "Task timer has been started",
      });

      onTaskUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const handleStopTimer = async () => {
    if (!user || !task.start_time) return;

    try {
      const startTime = new Date(task.start_time).getTime();
      const now = Date.now();
      const sessionTime = Math.floor((now - startTime) / 1000);
      const totalTime = task.time_spent + sessionTime;

      const { error } = await supabase
        .from('tasks')
        .update({
          is_timer_running: false,
          time_spent: totalTime,
          end_time: new Date().toISOString(),
          start_time: null,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Timer Stopped",
        description: `Session time: ${formatTime(sessionTime)}`,
      });

      onTaskUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-mono">{formatTime(currentTime)}</span>
      </div>
      
      {task.is_timer_running ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleStopTimer}
          className="flex items-center space-x-1"
        >
          <Pause className="w-3 h-3" />
          <span>Stop</span>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleStartTimer}
          className="flex items-center space-x-1"
        >
          <Play className="w-3 h-3" />
          <span>Start</span>
        </Button>
      )}
      
      <ManualTimeEntry task={task} onSuccess={onTaskUpdate} />
    </div>
  );
};