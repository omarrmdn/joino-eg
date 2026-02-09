# Smart Recommendation Algorithm

## Overview
This algorithm intelligently selects **ONE** personalized recommendation section to display on the home screen, similar to Reddit's "Because you've visited..." approach.

## How It Works

### 1. **Candidate Generation**
The algorithm evaluates 5 possible recommendation types:

| Type | Trigger Condition | Min Events | Base Score | Bonus |
|------|------------------|------------|------------|-------|
| **Popular in City** | User location detected | 3 | 100 | +5 per event |
| **Interest-Based** | User has interests set | 2 | 90 | +8 per event |
| **Nearby Events** | Location enabled | 3 | 85 | +6 per event |
| **Trending** | Events with 5+ attendees | 3 | 70 | +4 per event |
| **Suggested** | Always available | 3 | 50 | +2 per event |

### 2. **Scoring System**
Each candidate receives a score based on:
- **Base Score**: Reflects the recommendation type's priority
- **Event Count Bonus**: More relevant events = higher score
- **Quality Threshold**: Minimum event count ensures good recommendations

### 3. **Selection Algorithm**
```
1. Filter candidates that meet minimum event requirements
2. Sort by score (descending)
3. Take top 3 candidates
4. Use rotation seed to pick one from top 3
```

### 4. **Rotation Mechanism**
- **Refresh-based**: Changes on every pull-to-refresh action
- **Counter-driven**: Increments a counter to cycle through top 4 candidates
- **Predictable variety**: Shows different content each refresh in a cycle
- **Quality-first**: Always cycles through the best recommendations

**Example Cycle:**
```
Refresh 1: Shows candidate #1 (highest score)
Refresh 2: Shows candidate #2 (second highest)
Refresh 3: Shows candidate #3 (third highest)
Refresh 4: Shows candidate #4 (fourth highest)
Refresh 5: Shows candidate #1 (cycles back)
```

## Example Scenarios

### Scenario 1: User in Cairo with Music Interest
**Available Candidates:**
- Popular in Cairo: 8 events → Score: 140
- Interest: Music: 5 events → Score: 130
- Nearby: 4 events → Score: 109
- Trending: 3 events → Score: 82
- Suggested: 10 events → Score: 70

**Top 3:** Popular (140), Music (130), Nearby (109)
**Selected:** One of these three (rotates each session)

### Scenario 2: New User, No Location
**Available Candidates:**
- Trending: 6 events → Score: 94
- Suggested: 15 events → Score: 80

**Top 3:** Trending (94), Suggested (80)
**Selected:** One of these two (rotates each session)

### Scenario 3: User with Location, No Interests
**Available Candidates:**
- Nearby: 7 events → Score: 127
- Trending: 5 events → Score: 90
- Suggested: 12 events → Score: 74

**Top 3:** Nearby (127), Trending (90), Suggested (74)
**Selected:** One of these three (rotates each session)

## Benefits

✅ **No UI Clutter**: Only ONE section shows at a time
✅ **Smart Prioritization**: Best recommendations appear more often
✅ **Dynamic Variety**: Different sections on each session
✅ **Data-Driven**: Adapts to user's available data
✅ **Graceful Fallback**: Always shows something relevant

## Future Enhancements

- **Time-based rotation**: Change recommendation every few hours
- **Interaction tracking**: Boost score for sections user engages with
- **A/B testing**: Test different scoring weights
- **Collaborative filtering**: "Users like you also attended..."
