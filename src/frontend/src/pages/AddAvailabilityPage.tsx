import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useAddAvailability, useGetCallerAvailability } from '../hooks/useQueries';
import { getDayId, formatDate } from '../lib/date';

const TIME_OPTIONS = [
  '6:00 AM - 8:00 AM',
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
  '8:00 PM - 10:00 PM',
];

export default function AddAvailabilityPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { date?: string };
  
  const [selectedDate, setSelectedDate] = useState<Date>(
    search.date ? new Date(Number(BigInt(search.date).toString().slice(0, 4)), Number(BigInt(search.date).toString().slice(4, 6)) - 1, Number(BigInt(search.date).toString().slice(6, 8))) : new Date()
  );
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const dayId = getDayId(selectedDate);
  const { data: existingAvailability } = useGetCallerAvailability(dayId);
  const { mutate: addAvailability, isPending } = useAddAvailability();

  useEffect(() => {
    if (existingAvailability) {
      setTime(existingAvailability.time);
      setNotes(existingAvailability.notes || '');
    }
  }, [existingAvailability]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;

    addAvailability(
      { day: dayId, time, notes: notes.trim() || null },
      {
        onSuccess: () => {
          navigate({ to: '/day/$date', params: { date: dayId.toString() } });
        },
      }
    );
  };

  const handleBack = () => {
    navigate({ to: '/' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold">
          {existingAvailability ? 'Edit' : 'Add'} Availability
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="time">Time Available</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes (e.g., prefer doubles, bringing extra paddles, etc.)"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={!time || isPending} className="flex-1">
                {isPending ? 'Saving...' : existingAvailability ? 'Update Availability' : 'Add Availability'}
              </Button>
              <Button type="button" variant="outline" onClick={handleBack}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
