import { useState } from 'react';
import { useSaveCallerUserProfile } from '../../hooks/useCurrentUserProfile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const { mutate: saveProfile, isPending } = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveProfile({ name: name.trim() });
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome!</DialogTitle>
          <DialogDescription>
            Please enter your name to get started
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || isPending}>
            {isPending ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
