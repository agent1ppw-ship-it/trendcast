'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export default function ReviewGatingWidget({
    googleReviewLink = 'https://search.google.com/local/writereview?placeid=ChIJo4_', // Placeholder
    companyName = 'trendcast.io'
}) {
    const [rating, setRating] = useState<number>(0);
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string>('');

    const handleRating = (value: number) => {
        setRating(value);
    };

    const submitInternalFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        // In production, this drops to the Next.js API route to save to Supabase
        console.log(`Submitted negative feedback (${rating} stars): ${feedback}`);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto text-center border border-gray-100">
                <div className="text-green-500 text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
                <p className="text-gray-600">Your feedback has been received. We appreciate your time to help us improve.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100">
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
                How did we do?
            </h3>
            <p className="text-gray-500 text-center mb-6">
                Please rate your recent experience with {companyName}.
            </p>

            {/* Star Rating System */}
            <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`transition-colors duration-200 ${star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-gray-200'
                            }`}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => handleRating(star)}
                    >
                        <Star className="w-12 h-12 fill-current" />
                    </button>
                ))}
            </div>

            {/* Conditional Rendering logic based on Star Value */}
            {rating > 0 && rating <= 3 && (
                <form onSubmit={submitInternalFeedback} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-red-500 font-medium mb-3">
                        We're sorry we didn't meet your expectations. How can we make it right?
                    </p>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Tell us what went wrong..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="mt-4 w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Send Feedback to Owner
                    </button>
                </form>
            )}

            {rating >= 4 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                    <p className="text-green-600 font-medium mb-4">
                        We're thrilled you had a great experience! Would you mind leaving us a review on Google?
                    </p>
                    <a
                        href={googleReviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setSubmitted(true)}
                        className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                        <svg className="w-6 h-6 bg-white rounded-full p-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Leave a Review on Google
                    </a>
                </div>
            )}
        </div>
    );
}
