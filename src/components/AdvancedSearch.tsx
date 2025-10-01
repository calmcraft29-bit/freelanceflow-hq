import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, X, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export interface SearchFilters {
  query: string;
  status: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  clientId: string;
  projectId: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  clients?: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string }>;
  showClientFilter?: boolean;
  showProjectFilter?: boolean;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  clients = [],
  projects = [],
  showClientFilter = true,
  showProjectFilter = true,
  showStatusFilter = true,
  showDateFilter = true,
  statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ],
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    clientId: 'all',
    projectId: 'all',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: '',
      status: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      clientId: 'all',
      projectId: 'all',
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const hasActiveFilters = 
    filters.query !== '' ||
    filters.status !== 'all' ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.clientId !== 'all' ||
    filters.projectId !== 'all';

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowAdvanced(!showAdvanced)} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={handleSearch}>
            Search
          </Button>
          {hasActiveFilters && (
            <Button onClick={handleReset} variant="ghost">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {showStatusFilter && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showClientFilter && clients.length > 0 && (
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showProjectFilter && projects.length > 0 && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showDateFilter && (
              <>
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {filters.dateTo ? format(filters.dateTo, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
