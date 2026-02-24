import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
def get_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'code_learning'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
        port=os.getenv('DB_PORT', '5432')
    )

# Page config
st.set_page_config(
    page_title="Course Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        color: #a1609d;
        margin-bottom: 1rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 15px;
        padding: 1.5rem;
        border: 1px solid rgba(161, 96, 157, 0.3);
    }
    .stMetric {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 15px;
        padding: 1rem;
        border: 1px solid rgba(161, 96, 157, 0.3);
    }
    [data-testid="stMetricValue"] {
        color: #fef483;
    }
    .highlight {
        color: #a1609d;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar - Professor login/course selection
st.sidebar.image("https://img.icons8.com/fluency/96/graduation-cap.png", width=80)
st.sidebar.title("📊 Analytics Dashboard")
st.sidebar.markdown("---")

@st.cache_data(ttl=300)
def get_professors():
    """Get all professors"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, username, email FROM users WHERE role = 'professor' OR role = 'admin'")
    professors = cur.fetchall()
    cur.close()
    conn.close()
    return professors

@st.cache_data(ttl=300)
def get_professor_courses(professor_id):
    """Get courses created by a professor"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT c.id, c.title, c.difficulty, c.language, c.created_at,
               COUNT(DISTINCT e.id) as enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.created_by = %s
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """, (professor_id,))
    courses = cur.fetchall()
    cur.close()
    conn.close()
    return courses

@st.cache_data(ttl=60)
def get_course_stats(course_id):
    """Get detailed course statistics"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Basic course info
    cur.execute("SELECT * FROM courses WHERE id = %s", (course_id,))
    course = cur.fetchone()
    
    # Enrollment stats
    cur.execute("""
        SELECT 
            COUNT(*) as total_students,
            COUNT(CASE WHEN enrolled_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
            COUNT(CASE WHEN enrolled_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
        FROM enrollments WHERE course_id = %s
    """, (course_id,))
    enrollment_stats = cur.fetchone()
    
    # Time spent stats
    cur.execute("""
        SELECT 
            COALESCE(SUM(CASE 
                WHEN duration IS NOT NULL THEN duration
                ELSE EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer
            END), 0) as total_time,
            COUNT(*) as session_count,
            COALESCE(AVG(CASE 
                WHEN duration IS NOT NULL THEN duration
                ELSE EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer
            END), 0) as avg_session_time
        FROM time_sessions
        WHERE course_id = %s AND started_at IS NOT NULL
    """, (course_id,))
    time_stats = cur.fetchone()
    
    # Exercise completion stats
    cur.execute("""
        SELECT 
            COUNT(DISTINCT ex.id) as total_exercises,
            COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_count,
            COALESCE(AVG(up.best_score), 0) as avg_best_score
        FROM exercises ex
        LEFT JOIN user_progress up ON ex.id = up.exercise_id
        WHERE ex.course_id = %s
    """, (course_id,))
    exercise_stats = cur.fetchone()
    
    # Submission stats
    cur.execute("""
        SELECT 
            COUNT(*) as total_submissions,
            COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_submissions,
            COALESCE(AVG(score), 0) as avg_score
        FROM submissions s
        JOIN exercises ex ON s.exercise_id = ex.id
        WHERE ex.course_id = %s
    """, (course_id,))
    submission_stats = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return {
        'course': course,
        'enrollment': enrollment_stats,
        'time': time_stats,
        'exercises': exercise_stats,
        'submissions': submission_stats
    }

@st.cache_data(ttl=60)
def get_student_leaderboard(course_id):
    """Get top performing students"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT 
            u.id,
            u.username,
            u.email,
            COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as exercises_completed,
            COUNT(DISTINCT ex.id) as total_exercises,
            COALESCE(AVG(up.best_score), 0) as avg_score,
            COALESCE(SUM(CASE 
                WHEN ts.duration IS NOT NULL THEN ts.duration
                ELSE EXTRACT(EPOCH FROM (COALESCE(ts.ended_at, NOW()) - ts.started_at))::integer
            END), 0) as total_time,
            COUNT(DISTINCT s.id) as total_attempts
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN exercises ex ON ex.course_id = e.course_id
        LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
        LEFT JOIN time_sessions ts ON ts.course_id = e.course_id AND ts.user_id = e.user_id
        LEFT JOIN submissions s ON s.user_id = e.user_id AND s.exercise_id = ex.id
        WHERE e.course_id = %s
        GROUP BY u.id, u.username, u.email
        ORDER BY exercises_completed DESC, avg_score DESC
    """, (course_id,))
    students = cur.fetchall()
    cur.close()
    conn.close()
    return students

@st.cache_data(ttl=60)
def get_daily_activity(course_id):
    """Get daily activity data for the past 30 days"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT 
            DATE(ts.started_at) as date,
            COUNT(DISTINCT ts.user_id) as active_students,
            COUNT(*) as session_count,
            COALESCE(SUM(CASE 
                WHEN ts.duration IS NOT NULL THEN ts.duration
                ELSE EXTRACT(EPOCH FROM (COALESCE(ts.ended_at, NOW()) - ts.started_at))::integer
            END), 0) / 3600.0 as total_hours
        FROM time_sessions ts
        WHERE ts.course_id = %s 
          AND ts.started_at > NOW() - INTERVAL '30 days'
          AND ts.started_at IS NOT NULL
        GROUP BY DATE(ts.started_at)
        ORDER BY date
    """, (course_id,))
    activity = cur.fetchall()
    cur.close()
    conn.close()
    return activity

@st.cache_data(ttl=60)
def get_exercise_performance(course_id):
    """Get performance per exercise"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT 
            ex.id,
            ex.title,
            ex.difficulty,
            ex.order_index as ex_order,
            ch.title as chapter_title,
            ch.order_index as ch_order,
            COUNT(DISTINCT s.user_id) as attempts_by_users,
            COUNT(s.id) as total_attempts,
            COALESCE(AVG(s.score), 0) as avg_score,
            COUNT(CASE WHEN s.status = 'passed' THEN 1 END) as passed_count,
            COUNT(CASE WHEN up.completed = true THEN 1 END) as completion_count
        FROM exercises ex
        LEFT JOIN chapters ch ON ex.chapter_id = ch.id
        LEFT JOIN submissions s ON ex.id = s.exercise_id
        LEFT JOIN user_progress up ON ex.id = up.exercise_id
        WHERE ex.course_id = %s
        GROUP BY ex.id, ex.title, ex.difficulty, ex.order_index, ch.title, ch.order_index
        ORDER BY ch_order NULLS LAST, ex_order NULLS LAST, ex.id
    """, (course_id,))
    exercises = cur.fetchall()
    cur.close()
    conn.close()
    return exercises

@st.cache_data(ttl=60)
def get_hourly_distribution(course_id):
    """Get activity distribution by hour"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT 
            EXTRACT(HOUR FROM started_at)::integer as hour,
            COUNT(*) as session_count
        FROM time_sessions
        WHERE course_id = %s AND started_at IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM started_at)
        ORDER BY hour
    """, (course_id,))
    hourly = cur.fetchall()
    cur.close()
    conn.close()
    return hourly

def format_time(seconds):
    """Format seconds to readable time"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{int(hours)}h {int(minutes)}m"

def get_course_by_id(course_id):
    """Get course info by ID"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM courses WHERE id = %s", (course_id,))
    course = cur.fetchone()
    cur.close()
    conn.close()
    return course

def get_course_by_id_and_professor(course_id, professor_id):
    """Get course info by ID, verifying it belongs to the professor"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM courses WHERE id = %s AND created_by = %s", (course_id, professor_id))
    course = cur.fetchone()
    cur.close()
    conn.close()
    return course

# Main app
try:
    # Check for URL query parameters
    query_params = st.query_params
    url_course_id = query_params.get("course_id")
    url_professor_id = query_params.get("professor_id")
    
    # If course_id is in URL, use direct mode (no sidebar selection)
    if url_course_id:
        selected_course_id = int(url_course_id)
        
        # If professor_id provided, verify course ownership
        if url_professor_id:
            professor_id = int(url_professor_id)
            course_info = get_course_by_id_and_professor(selected_course_id, professor_id)
            
            if not course_info:
                st.error("Course not found or you don't have permission to view this course's analytics.")
                st.stop()
        else:
            course_info = get_course_by_id(selected_course_id)
            
            if not course_info:
                st.error("Course not found.")
                st.stop()
        
        # Back button to React app
        st.markdown(f"""
            <a href="{os.getenv('FRONTEND_URL', 'https://my-noteg.com')}/professor" target="_self" style="
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(161, 96, 157, 0.2);
                border: 1px solid #a1609d;
                border-radius: 8px;
                color: #a1609d;
                text-decoration: none;
                font-weight: 500;
                margin-bottom: 20px;
            ">← Back to Dashboard</a>
        """, unsafe_allow_html=True)
        
        st.sidebar.image("https://img.icons8.com/fluency/96/graduation-cap.png", width=80)
        st.sidebar.title("📊 Course Analytics")
        st.sidebar.markdown("---")
        st.sidebar.markdown(f"**Course:** {course_info['title']}")
        st.sidebar.markdown(f"**Difficulty:** {course_info['difficulty']}")
        if course_info.get('language'):
            st.sidebar.markdown(f"**Language:** {course_info['language']}")
    else:
        # Original sidebar selection mode
        st.sidebar.image("https://img.icons8.com/fluency/96/graduation-cap.png", width=80)
        st.sidebar.title("📊 Analytics Dashboard")
        st.sidebar.markdown("---")
        
        professors = get_professors()
        
        if not professors:
            st.warning("No professors found in the system.")
            st.stop()
        
        # Professor selection
        professor_options = {f"{p['username']} ({p['email']})": p['id'] for p in professors}
        selected_prof_name = st.sidebar.selectbox("Select Professor", list(professor_options.keys()))
        selected_professor_id = professor_options[selected_prof_name]
        
        # Course selection
        courses = get_professor_courses(selected_professor_id)
        
        if not courses:
            st.markdown('<p class="main-header">📊 Course Analytics</p>', unsafe_allow_html=True)
            st.info("No courses found for this professor. Create a course to see analytics.")
            st.stop()
        
        course_options = {f"{c['title']} ({c['language']})": c['id'] for c in courses}
        selected_course_name = st.sidebar.selectbox("Select Course", list(course_options.keys()))
        selected_course_id = course_options[selected_course_name]
        course_info = get_course_by_id(selected_course_id)
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Quick Stats**")
    
    # Get course data
    stats = get_course_stats(selected_course_id)
    students = get_student_leaderboard(selected_course_id)
    daily_activity = get_daily_activity(selected_course_id)
    exercise_perf = get_exercise_performance(selected_course_id)
    hourly_dist = get_hourly_distribution(selected_course_id)
    
    # Sidebar quick stats
    st.sidebar.metric("Students", stats['enrollment']['total_students'])
    st.sidebar.metric("Total Time", format_time(stats['time']['total_time']))
    st.sidebar.metric("Submissions", stats['submissions']['total_submissions'])
    
    # Main content
    st.markdown(f'<p class="main-header">📊 {stats["course"]["title"]}</p>', unsafe_allow_html=True)
    
    # Top metrics row
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric(
            "👥 Total Students",
            stats['enrollment']['total_students'],
            f"+{stats['enrollment']['new_this_week']} this week"
        )
    
    with col2:
        st.metric(
            "⏱️ Total Time Spent",
            format_time(stats['time']['total_time']),
            f"Avg: {format_time(stats['time']['avg_session_time'])}/session"
        )
    
    with col3:
        st.metric(
            "📝 Submissions",
            stats['submissions']['total_submissions'],
            f"{stats['submissions']['passed_submissions']} passed"
        )
    
    with col4:
        pass_rate = 0
        if stats['submissions']['total_submissions'] > 0:
            pass_rate = (stats['submissions']['passed_submissions'] / stats['submissions']['total_submissions']) * 100
        st.metric(
            "✅ Pass Rate",
            f"{pass_rate:.1f}%",
            ""
        )
    
    with col5:
        st.metric(
            "📊 Avg Score",
            f"{stats['submissions']['avg_score']:.1f}%",
            ""
        )
    
    st.markdown("---")
    
    # Charts row
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📈 Daily Activity (Last 30 Days)")
        if daily_activity:
            df_activity = pd.DataFrame(daily_activity)
            fig = px.area(
                df_activity, 
                x='date', 
                y='total_hours',
                labels={'date': 'Date', 'total_hours': 'Hours'},
                color_discrete_sequence=['#a1609d']
            )
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color='white',
                xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
                yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No activity data available yet.")
    
    with col2:
        st.subheader("🕐 Activity by Hour")
        if hourly_dist:
            df_hourly = pd.DataFrame(hourly_dist)
            # Fill missing hours
            all_hours = pd.DataFrame({'hour': range(24)})
            df_hourly = all_hours.merge(df_hourly, on='hour', how='left').fillna(0)
            
            fig = px.bar(
                df_hourly,
                x='hour',
                y='session_count',
                labels={'hour': 'Hour of Day', 'session_count': 'Sessions'},
                color_discrete_sequence=['#fef483']
            )
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color='white',
                xaxis=dict(gridcolor='rgba(255,255,255,0.1)', tickmode='linear'),
                yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No hourly data available yet.")
    
    st.markdown("---")
    
    # Student Leaderboard
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("🏆 Student Leaderboard")
        if students:
            df_students = pd.DataFrame(students)
            df_students['progress'] = df_students.apply(
                lambda x: f"{x['exercises_completed']}/{x['total_exercises']}" if x['total_exercises'] > 0 else "0/0",
                axis=1
            )
            df_students['time_spent'] = df_students['total_time'].apply(format_time)
            df_students['avg_score'] = df_students['avg_score'].apply(lambda x: f"{x:.1f}%")
            
            display_df = df_students[['username', 'progress', 'avg_score', 'time_spent', 'total_attempts']].head(10)
            display_df.columns = ['Student', 'Exercises', 'Avg Score', 'Time Spent', 'Attempts']
            display_df.index = range(1, len(display_df) + 1)
            display_df.index.name = 'Rank'
            
            st.dataframe(display_df, use_container_width=True)
        else:
            st.info("No students enrolled yet.")
    
    with col2:
        st.subheader("🥇 Top Performer")
        if students and len(students) > 0:
            top = students[0]
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, #a1609d 0%, #fef483 100%); 
                        border-radius: 15px; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #1a1a2e;">🏆</h2>
                <h3 style="margin: 10px 0; color: #1a1a2e;">{top['username']}</h3>
                <p style="margin: 5px 0; color: #1a1a2e;">
                    <strong>{top['exercises_completed']}</strong> exercises completed<br>
                    <strong>{top['avg_score']:.1f}%</strong> average score<br>
                    <strong>{format_time(top['total_time'])}</strong> time spent
                </p>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.info("No top performer yet.")
    
    st.markdown("---")
    
    # Exercise Performance
    st.subheader("📚 Exercise Performance")
    if exercise_perf:
        df_exercises = pd.DataFrame(exercise_perf)
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            name='Attempts',
            x=df_exercises['title'],
            y=df_exercises['total_attempts'],
            marker_color='#a1609d'
        ))
        
        fig.add_trace(go.Bar(
            name='Passed',
            x=df_exercises['title'],
            y=df_exercises['passed_count'],
            marker_color='#4ade80'
        ))
        
        fig.update_layout(
            barmode='group',
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font_color='white',
            xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
            yaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
            legend=dict(orientation='h', yanchor='bottom', y=1.02)
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Exercise difficulty breakdown
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 Average Score by Exercise")
            fig = px.bar(
                df_exercises,
                x='title',
                y='avg_score',
                color='difficulty',
                color_discrete_map={'easy': '#4ade80', 'medium': '#fef483', 'hard': '#ef4444'},
                labels={'title': 'Exercise', 'avg_score': 'Avg Score (%)'}
            )
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color='white',
                xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
                yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
            )
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.subheader("🎯 Difficulty Distribution")
            difficulty_counts = df_exercises['difficulty'].value_counts()
            fig = px.pie(
                values=difficulty_counts.values,
                names=difficulty_counts.index,
                color=difficulty_counts.index,
                color_discrete_map={'easy': '#4ade80', 'medium': '#fef483', 'hard': '#ef4444'}
            )
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color='white'
            )
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No exercises in this course yet.")
    
    # Footer
    st.markdown("---")
    st.markdown(
        f"<p style='text-align: center; color: gray;'>Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>",
        unsafe_allow_html=True
    )

except Exception as e:
    st.error(f"Error connecting to database: {str(e)}")
    st.info("Make sure PostgreSQL is running and the database credentials are correct.")
