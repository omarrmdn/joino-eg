// app/events/[id].tsx
// Example Event Details Screen with all notification features integrated

import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../src/constants/Colors';
import { Fonts } from '../src/constants/Fonts';
import { useAlert } from '../src/lib/AlertContext';
import { useSupabaseClient } from '../src/lib/supabaseConfig';
import {
    answerEventQuestion,
    askEventQuestion,
    getEventQuestions,
    getEventViewStats,
    isUserAttending,
    joinEvent,
    leaveEvent,
    trackEventView,
} from './eventUtils';

interface Event {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  date: string;
  time: string;
  location: string;
  is_online: boolean;
  max_capacity: number;
  price: number;
  image_url: string;
}

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const supabase = useSupabaseClient();
  const { showAlert } = useAlert();

  const [event, setEvent] = useState<Event | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [isAttending, setIsAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Load event details
  useEffect(() => {
    loadEventDetails();
  }, [id]);

  // Track view when screen loads
  useEffect(() => {
    if (id && userId) {
      trackEventView(supabase, id, userId);
      loadViewCount();
    }
  }, [id, userId]);

  const loadEventDetails = async () => {
    if (!id) return;

    try {
      // Get event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Get attendee count
      const { count } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id);

      setAttendeeCount(count || 0);

      // Check if user is attending
      if (userId) {
        const attending = await isUserAttending(supabase, id, userId);
        setIsAttending(attending);
      }

      // Load questions
      const questionsData = await getEventQuestions(supabase, id);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading event:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load event details',
        type: 'error'
      });
    }
  };

  const loadViewCount = async () => {
    const count = await getEventViewStats(supabase, id);
    setViewCount(count);
  };

  const handleRSVP = async () => {
    if (!userId || !event) return;

    try {
      if (isAttending) {
        // Leave event - organizer will get cancellation notification
        const result = await leaveEvent(supabase, id, userId);
        if (result.success) {
          setIsAttending(false);
          setAttendeeCount((prev) => prev - 1);
          showAlert({
            title: 'Success',
            message: 'You have cancelled your RSVP',
            type: 'success'
          });
        }
      } else {
        // Join event - organizer will get new attendee notification
        const result = await joinEvent(supabase, id, userId);
        if (result.success) {
          setIsAttending(true);
          setAttendeeCount((prev) => prev + 1);
          showAlert({
            title: 'Success',
            message: 'You are now attending this event!',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Error with RSVP:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to update RSVP',
        type: 'error'
      });
    }
  };

  const handleAskQuestion = async () => {
    if (!userId || !event || !questionText.trim()) return;

    try {
      // Ask question - organizer will get notification
      const result = await askEventQuestion(
        supabase,
        id,
        userId,
        event.organizer_id,
        questionText
      );

      if (result.success) {
        setQuestionText('');
        showAlert({
          title: 'Question Sent',
          message: 'Your question has been sent to the organizer',
          type: 'success'
        });
        
        // Reload questions
        const questionsData = await getEventQuestions(supabase, id);
        setQuestions(questionsData);
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to send question',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error asking question:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to send question',
        type: 'error'
      });
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    if (!answerText.trim()) return;

    try {
      const result = await answerEventQuestion(supabase, questionId, answerText);

      if (result.success) {
        setAnswerText('');
        setSelectedQuestionId(null);
        showAlert({
          title: 'Success',
          message: 'Answer posted!',
          type: 'success'
        });
        
        // Reload questions
        const questionsData = await getEventQuestions(supabase, id);
        setQuestions(questionsData);
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to post answer',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error answering question:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to post answer',
        type: 'error'
      });
    }
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.white, marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  const isOrganizer = userId === event.organizer_id;

  return (
    <ScrollView style={styles.container}>
      {/* Event Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>
          {new Date(event.date).toLocaleDateString()} at{' '}
          {event.time}
        </Text>
        <Text style={styles.location}>
          {event.is_online ? '🌐 Online' : `📍 ${event.location}`}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendeeCount}</Text>
          <Text style={styles.statLabel}>Attending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{viewCount}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        {event.max_capacity && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{event.max_capacity}</Text>
            <Text style={styles.statLabel}>Capacity</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{event.description}</Text>
      </View>

      {/* RSVP Button */}
      {!isOrganizer && (
        <TouchableOpacity
          style={[styles.rsvpButton, isAttending && styles.rsvpButtonAttending]}
          onPress={handleRSVP}
        >
          <Text style={styles.rsvpButtonText}>
            {isAttending ? 'Cancel RSVP' : 'RSVP to Event'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Questions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions & Answers</Text>

        {/* Ask Question Form (only if not organizer) */}
        {!isOrganizer && (
          <View style={styles.questionForm}>
            <TextInput
              style={styles.questionInput}
              placeholder="Ask the organizer a question..."
              value={questionText}
              onChangeText={setQuestionText}
              multiline
            />
            <TouchableOpacity
              style={styles.askButton}
              onPress={handleAskQuestion}
              disabled={!questionText.trim()}
            >
              <Text style={styles.askButtonText}>Ask Question</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <Text style={styles.noQuestions}>No questions yet</Text>
        ) : (
          questions.map((q) => (
            <View key={q.id} style={styles.questionItem}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionAsker}>{q.user.name}</Text>
                <Text style={styles.questionTime}>
                  {new Date(q.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.questionText}>{q.question}</Text>

              {q.answer ? (
                <View style={styles.answer}>
                  <Text style={styles.answerLabel}>Answer from organizer:</Text>
                  <Text style={styles.answerText}>{q.answer}</Text>
                </View>
              ) : isOrganizer ? (
                <View style={styles.answerForm}>
                  {selectedQuestionId === q.id ? (
                    <>
                      <TextInput
                        style={styles.answerInput}
                        placeholder="Type your answer..."
                        value={answerText}
                        onChangeText={setAnswerText}
                        multiline
                      />
                      <View style={styles.answerButtons}>
                        <TouchableOpacity
                          style={styles.answerButton}
                          onPress={() => handleAnswerQuestion(q.id)}
                        >
                          <Text style={styles.answerButtonText}>Post Answer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setSelectedQuestionId(null);
                            setAnswerText('');
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.answerLinkButton}
                      onPress={() => setSelectedQuestionId(q.id)}
                    >
                      <Text style={styles.answerLinkText}>Answer this question</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.noAnswer}>Not answered yet</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontFamily: Fonts.regular,
  },
  location: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  stats: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Fonts.regular,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontFamily: Fonts.regular,
  },
  rsvpButton: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  rsvpButtonAttending: {
    backgroundColor: '#ef4444', // Red for cancel is okay, or use a neutral color
  },
  rsvpButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  questionForm: {
    marginBottom: 20,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: Colors.lightblack,
    backgroundColor: Colors.lightblack,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  askButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  askButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  noQuestions: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 20,
  },
  questionItem: {
    backgroundColor: Colors.lightblack,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionAsker: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  questionTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  questionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontFamily: Fonts.regular,
  },
  answer: {
    backgroundColor: Colors.black,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  noAnswer: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  answerForm: {
    marginTop: 8,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: Colors.lightblack,
    backgroundColor: Colors.black,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.white,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  answerButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  answerButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.lightblack,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  answerLinkButton: {
    marginTop: 8,
  },
  answerLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
});
