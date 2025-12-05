'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateChatFeedback } from '@/app/actions';
import { toast } from 'sonner';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: number;
  onFeedbackSubmitted?: () => void;
}

const FEEDBACK_OPTIONS = [
  'Research not accurate / complete',
  'Citations not accurate / complete',
  'Questions not relevant',
  'Client draft not accurate',
  'Additional research not accurate',
  'Additional client draft not accurate',
];

export function FeedbackDialog({ isOpen, onClose, chatId, onFeedbackSubmitted }: FeedbackDialogProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionToggle = (option: string) => {
    setSelectedOptions(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateChatFeedback(
        chatId,
        -1, // Down vote
        selectedOptions.length > 0 ? selectedOptions : null,
        additionalComments.trim() || null
      );

      if (result.success) {
        toast.success('Feedback submitted', {
          description: 'Thank you for your feedback.',
          duration: 2000,
        });
        // Reset form
        setSelectedOptions([]);
        setAdditionalComments('');
        onFeedbackSubmitted?.();
        onClose();
      } else {
        toast.error('Failed to submit feedback', {
          description: result.error || 'Please try again.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback', {
        description: 'An unexpected error occurred.',
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedOptions([]);
    setAdditionalComments('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>We appreciate your feedback!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Checkbox Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Please select the reason(s) for your feedback:</Label>
            <div className="space-y-3">
              {FEEDBACK_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={() => handleOptionToggle(option)}
                  />
                  <Label
                    htmlFor={option}
                    className="text-sm font-normal cursor-pointer leading-tight"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label htmlFor="additional-comments" className="text-sm font-medium">
              Additional comments
            </Label>
            <Textarea
              id="additional-comments"
              placeholder="Type in any additional comments here ..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
