import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Event, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CalendarSync } from '@/components/CalendarSync';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const localizer = momentLocalizer(moment);

type Project = Tables<'projects'>;
type Task = Tables<'tasks'>;

interface CalendarEvent extends Event {
  id: string;
  type: 'project' | 'task';
  resourceId?: string;
  status?: string;
}

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showSync, setShowSync] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch projects with deadlines
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .not('end_date', 'is', null);

      if (projectsError) throw projectsError;

      // Fetch tasks with due dates
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('due_date', 'is', null);

      if (tasksError) throw tasksError;

      // Convert to calendar events
      const projectEvents: CalendarEvent[] = (projects || []).map((project: Project) => ({
        id: project.id,
        title: `📋 ${project.name}`,
        start: new Date(project.end_date!),
        end: new Date(project.end_date!),
        type: 'project' as const,
        resourceId: project.id,
        status: project.status,
      }));

      const taskEvents: CalendarEvent[] = (tasks || []).map((task: Task) => ({
        id: task.id,
        title: `✓ ${task.name}`,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        type: 'task' as const,
        resourceId: task.id,
        status: task.status,
      }));

      setEvents([...projectEvents, ...taskEvents]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEvent; start: Date }) => {
      try {
        if (event.type === 'project') {
          const { error } = await supabase
            .from('projects')
            .update({ end_date: start.toISOString().split('T')[0] })
            .eq('id', event.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('tasks')
            .update({ due_date: start.toISOString() })
            .eq('id', event.id);

          if (error) throw error;
        }

        toast({
          title: "Success",
          description: `${event.type === 'project' ? 'Project' : 'Task'} rescheduled successfully`,
        });

        fetchEvents();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reschedule",
          variant: "destructive",
        });
      }
    },
    []
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    
    if (event.type === 'project') {
      backgroundColor = event.status === 'active' ? 'hsl(var(--primary))' : 'hsl(var(--muted))';
    } else {
      backgroundColor = event.status === 'completed' ? 'hsl(var(--accent))' : 'hsl(var(--secondary))';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-xl font-semibold">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex justify-between items-center mb-4 p-4 bg-card rounded-lg border">
        <div className="flex gap-2">
          <Button onClick={goToBack} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={goToCurrent} variant="outline" size="sm">
            Today
          </Button>
          <Button onClick={goToNext} variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div>{label()}</div>
        <div className="flex gap-2">
          <Button
            onClick={() => toolbar.onView(Views.MONTH)}
            variant={toolbar.view === Views.MONTH ? 'default' : 'outline'}
            size="sm"
          >
            Month
          </Button>
          <Button
            onClick={() => toolbar.onView(Views.WEEK)}
            variant={toolbar.view === Views.WEEK ? 'default' : 'outline'}
            size="sm"
          >
            Week
          </Button>
          <Button
            onClick={() => toolbar.onView(Views.DAY)}
            variant={toolbar.view === Views.DAY ? 'default' : 'outline'}
            size="sm"
          >
            Day
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-8 h-8" />
          Calendar
        </h1>
        <Button onClick={() => setShowSync(true)}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          Sync Calendar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects & Tasks Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onEventDrop={handleEventDrop}
              eventPropGetter={eventStyleGetter}
              draggableAccessor={() => true}
              resizable
              components={{
                toolbar: CustomToolbar,
              }}
              style={{ height: '100%' }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSync} onOpenChange={setShowSync}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calendar Sync</DialogTitle>
          </DialogHeader>
          <CalendarSync onClose={() => setShowSync(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
