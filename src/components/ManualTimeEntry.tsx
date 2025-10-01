import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Clock, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

interface ManualTimeEntry {
  date: string;
  hours: number;
  minutes: number;
  description: string;
}

interface ManualTimeEntryProps {
  task: Task;
  onSuccess: () => void;
}

export const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({ task, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('0');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hoursNum = parseInt(hours) || 0;
      const minutesNum = parseInt(minutes) || 0;
      const totalSeconds = (hoursNum * 3600) + (minutesNum * 60);

      if (totalSeconds <= 0) {
        toast({
          title: "Invalid Time",
          description: "Please enter a valid time amount",
          variant: "destructive",
        });
        return;
      }

      const entry: ManualTimeEntry = {
        date: format(date, 'yyyy-MM-dd'),
        hours: hoursNum,
        minutes: minutesNum,
        description,
      };

      const currentEntries = (task.manual_time_entries as unknown as ManualTimeEntry[]) || [];
      const updatedEntries = [...currentEntries, entry];

      const { error } = await supabase
        .from('tasks')
        .update({
          manual_time_entries: updatedEntries as unknown as any,
          time_spent: task.time_spent + totalSeconds,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry added successfully",
      });

      setOpen(false);
      setHours('0');
      setMinutes('0');
      setDescription('');
      onSuccess();
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast({
        title: "Error",
        description: "Failed to add time entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-3 h-3 mr-1" />
          Add Time
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Clock className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
