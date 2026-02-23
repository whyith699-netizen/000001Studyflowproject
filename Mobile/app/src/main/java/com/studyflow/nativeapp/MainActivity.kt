package com.studyflow.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.OAuthProvider
import kotlinx.coroutines.launch

private val Blue = Color(0xFF2384E8)
private val BlueDark = Color(0xFF1A6FD4)
private val Bg = Color(0xFFF2F5FA)
private val Ink = Color(0xFF0C1428)
private val Soft = Color(0xFF6E7D97)
private val Green = Color(0xFF22A862)
private val Orange = Color(0xFFFF8A2A)

private enum class AppTab(val label: String) { Dashboard("Home"), Calendar("Calendar"), Focus("Focus"), Stats("Stats"), Profile("Profile") }

private data class GoalItem(
    val title: String,
    val detail: String,
    val badge: String,
    val badgeBg: Color,
    val badgeFg: Color,
    val done: Boolean
)

private data class SessionItem(
    val status: String,
    val title: String,
    val time: String,
    val accent: Color,
    val subject: String,
    val joined: String,
    val action: String?
)

private data class FocusTaskItem(
    val title: String,
    val subtitle: String,
    val iconBg: Color
)

class MainActivity : ComponentActivity() {
    private lateinit var auth: FirebaseAuth
    private lateinit var backendRepository: BackendRepository
    private lateinit var authListener: FirebaseAuth.AuthStateListener

    private var email by mutableStateOf("")
    private var password by mutableStateOf("")
    private var displayName by mutableStateOf("")
    private var loading by mutableStateOf(false)
    private var status by mutableStateOf("")
    private var statusErr by mutableStateOf(false)
    private var user by mutableStateOf<FirebaseUser?>(null)
    private var tab by mutableStateOf(AppTab.Dashboard)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            FirebaseInitializer.ensureInitialized(applicationContext)
            auth = FirebaseAuth.getInstance()
            backendRepository = BackendRepository(auth)
        } catch (e: Exception) {
            setStatus("Firebase init failed: ${e.message}", true)
        }

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = Bg) {
                    if (user == null) {
                        AuthScreen(email, password, loading, status, statusErr, { email = it }, { password = it }, { login() }, { register() }, { googleLogin() })
                    } else {
                        MainShell(user!!, displayName, tab, loading, status, statusErr, { tab = it }, { displayName = it }, { saveProfile() }, { logout() })
                    }
                }
            }
        }
        if (::auth.isInitialized) observeAuth()
    }

    override fun onDestroy() {
        if (::auth.isInitialized && ::authListener.isInitialized) auth.removeAuthStateListener(authListener)
        super.onDestroy()
    }

    private fun observeAuth() {
        authListener = FirebaseAuth.AuthStateListener {
            user = it.currentUser
            if (user != null) loadProfile() else displayName = ""
        }
        auth.addAuthStateListener(authListener)
    }

    private fun ready(): Boolean {
        if (!::auth.isInitialized || !::backendRepository.isInitialized) { setStatus("Firebase/Backend is not initialized.", true); return false }
        return true
    }

    private fun login() {
        if (!ready() || !validate()) return
        loading = true
        auth.signInWithEmailAndPassword(email.trim(), password).addOnCompleteListener {
            loading = false
            if (it.isSuccessful) { setStatus("Login success.", false); tab = AppTab.Dashboard } else setStatus(AuthErrorMapper.fromException(it.exception), true)
        }
    }

    private fun register() {
        if (!ready() || !validate()) return
        loading = true
        auth.createUserWithEmailAndPassword(email.trim(), password).addOnCompleteListener {
            loading = false
            if (it.isSuccessful) { setStatus("Account created.", false); tab = AppTab.Dashboard } else setStatus(AuthErrorMapper.fromException(it.exception), true)
        }
    }

    private fun googleLogin() {
        if (!::auth.isInitialized) { setStatus("Firebase Auth is not initialized.", true); return }
        loading = true
        val provider = OAuthProvider.newBuilder("google.com").apply { addCustomParameter("prompt", "select_account"); scopes = listOf("email", "profile") }
        val pending = auth.pendingAuthResult
        if (pending != null) {
            pending.addOnSuccessListener { loading = false; setStatus("Google login success.", false); tab = AppTab.Dashboard }
                .addOnFailureListener { loading = false; setStatus(AuthErrorMapper.fromException(it), true) }
            return
        }
        auth.startActivityForSignInWithProvider(this, provider.build())
            .addOnSuccessListener { loading = false; setStatus("Google login success.", false); tab = AppTab.Dashboard }
            .addOnFailureListener { loading = false; setStatus(AuthErrorMapper.fromException(it), true) }
    }

    private fun saveProfile() {
        if (!::backendRepository.isInitialized) { setStatus("Backend repository is not initialized.", true); return }
        if (auth.currentUser == null) { setStatus("You must login first.", true); return }

        val normalized = displayName.trim()
        if (normalized.isBlank()) { setStatus("Display name cannot be empty.", true); return }

        loading = true
        lifecycleScope.launch {
            try {
                val response = backendRepository.updateProfile(normalized)
                displayName = response.profile.displayName
                setStatus("Profile saved.", false)
                tab = AppTab.Dashboard
            } catch (error: Throwable) {
                setStatus("Failed saving profile: ${BackendErrorMapper.fromThrowable(error)}", true)
            } finally {
                loading = false
            }
        }
    }

    private fun loadProfile() {
        if (!::backendRepository.isInitialized || auth.currentUser == null) return

        lifecycleScope.launch {
            try {
                val profile = backendRepository.getProfile()
                displayName = profile.displayName
            } catch (error: Throwable) {
                setStatus("Failed loading profile: ${BackendErrorMapper.fromThrowable(error)}", true)
            }
        }
    }

    private fun validate(): Boolean {
        if (email.isBlank() || password.isBlank()) { setStatus("Email and password are required.", true); return false }
        if (password.length < 6) { setStatus("Password must be at least 6 characters.", true); return false }
        return true
    }

    private fun logout() { auth.signOut(); tab = AppTab.Dashboard; setStatus("Logged out.", false) }
    private fun setStatus(message: String, err: Boolean) { status = message; statusErr = err }
}

@Composable
private fun AuthScreen(
    email: String,
    password: String,
    loading: Boolean,
    status: String,
    statusErr: Boolean,
    onEmail: (String) -> Unit,
    onPassword: (String) -> Unit,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onGoogle: () -> Unit
) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("StudyFlow Native", color = Ink, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        Text("Firebase Auth + Backend API", color = Soft)
        Spacer(Modifier.height(16.dp))
        if (status.isNotBlank()) { Text(status, color = if (statusErr) Color(0xFFB00020) else Green); Spacer(Modifier.height(8.dp)) }
        OutlinedTextField(value = email, onValueChange = onEmail, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = !loading)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = password, onValueChange = onPassword, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), enabled = !loading)
        Spacer(Modifier.height(12.dp))
        Button(onClick = onLogin, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("Login") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onGoogle, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("Continue with Google") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onRegister, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("Register") }
        if (loading) { Spacer(Modifier.height(16.dp)); CircularProgressIndicator() }
    }
}

@Composable
private fun MainShell(
    user: FirebaseUser,
    displayName: String,
    tab: AppTab,
    loading: Boolean,
    status: String,
    statusErr: Boolean,
    onTab: (AppTab) -> Unit,
    onDisplayName: (String) -> Unit,
    onSave: () -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = Bg,
        bottomBar = { BottomBar(tab, onTab) },
        floatingActionButton = { if (tab == AppTab.Dashboard || tab == AppTab.Calendar) FloatingActionButton(onClick = {}, containerColor = Blue) { Text("+", color = Color.White, fontSize = 28.sp) } }
    ) { p ->
        when (tab) {
            AppTab.Dashboard -> DashboardScreen(displayName, status, statusErr, Modifier.padding(p))
            AppTab.Calendar -> CalendarScreen(Modifier.padding(p))
            AppTab.Focus -> FocusScreen(Modifier.padding(p))
            AppTab.Stats -> StatsScreen(Modifier.padding(p))
            AppTab.Profile -> ProfileScreen(user, displayName, loading, status, statusErr, onDisplayName, onSave, onLogout, Modifier.padding(p))
        }
    }
}

@Composable
private fun BottomBar(tab: AppTab, onTab: (AppTab) -> Unit) {
    NavigationBar(containerColor = Color.White) {
        AppTab.entries.forEach {
            NavigationBarItem(
                selected = tab == it,
                onClick = { onTab(it) },
                icon = { Box(Modifier.size(8.dp).background(if (tab == it) Blue else Color(0xFFA9B7CD), CircleShape)) },
                label = { Text(it.label) }
            )
        }
    }
}

@Composable
private fun DashboardScreen(displayName: String, status: String, statusErr: Boolean, modifier: Modifier = Modifier) {
    val goals = listOf(
        GoalItem("Complete Math Assignment", "1h 30m", "DONE", Color(0xFFDDF6E7), Green, true),
        GoalItem("Read Chapter 4 of History", "45m", "HIGH PRIORITY", Color(0xFFFFECD8), Orange, false),
        GoalItem("Practice French Vocab", "20m", "MORNING", Color(0xFFE8F0FF), Blue, false)
    )

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(52.dp).background(Color(0xFFF6D7C5), CircleShape).border(2.dp, Color(0xFFAFD4FF), CircleShape),
                    contentAlignment = Alignment.Center
                ) { Text("A", color = Ink, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Good Morning,", color = Soft)
                    Text(if (displayName.isBlank()) "Alex Johnson" else displayName, color = Ink, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
            }
            Box(Modifier.size(28.dp).background(Color(0xFFE6EDF8), CircleShape), contentAlignment = Alignment.Center) {
                Text("!", color = Ink, fontWeight = FontWeight.Bold)
            }
        }

        Card(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
        ) {
            Row(
                Modifier.fillMaxWidth().padding(18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Current Streak", color = Soft, fontSize = 16.sp)
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text("12", color = Blue, fontSize = 44.sp, fontWeight = FontWeight.ExtraBold)
                        Spacer(Modifier.width(6.dp))
                        Text("Days", color = Blue, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Text("3 days until 15-day milestone!", color = Soft)
                }
                Box(Modifier.size(82.dp).background(Color(0xFFEAF2FF), CircleShape), contentAlignment = Alignment.Center) {
                    Text("*", color = Blue, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Active Session", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("FOCUS MODE", color = Blue, fontWeight = FontWeight.Bold)
        }
        Card(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent)
        ) {
            Box(Modifier.background(Brush.verticalGradient(listOf(Blue, BlueDark)), RoundedCornerShape(22.dp)).padding(18.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("Organic Chemistry Revision", color = Color.White)
                    Text("25:00", color = Color.White, fontSize = 62.sp, fontWeight = FontWeight.ExtraBold)
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(8.dp).background(Color(0x44FFFFFF), RoundedCornerShape(99.dp))) {
                        Box(Modifier.fillMaxWidth(0.65f).height(8.dp).background(Color.White, RoundedCornerShape(99.dp)))
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircleControl("R")
                        Box(Modifier.size(72.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                            Text("II", color = Blue, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                        }
                        CircleControl(">|")
                    }
                }
            }
        }

        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Daily Goals", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("View All", color = Blue, fontWeight = FontWeight.Bold)
        }

        goals.forEach { item ->
            Card(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = item.done, onCheckedChange = null)
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            item.title,
                            color = if (item.done) Soft else Ink,
                            fontWeight = FontWeight.Bold,
                            textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None
                        )
                        Spacer(Modifier.height(3.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.detail, color = Soft)
                            Spacer(Modifier.width(8.dp))
                            Badge(item.badge, item.badgeBg, item.badgeFg)
                        }
                    }
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SummaryCard("FOCUS TIME", "4.2h", "+12%", Green, Modifier.weight(1f))
            SummaryCard("COMPLETED", "8/12", "tasks", Soft, Modifier.weight(1f))
        }

        if (status.isNotBlank()) {
            Text(
                status,
                color = if (statusErr) Color(0xFFB00020) else Green,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
        Spacer(Modifier.height(26.dp))
    }
}

@Composable
private fun CircleControl(label: String) {
    Box(
        modifier = Modifier.size(54.dp).border(2.dp, Color(0x66FFFFFF), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Badge(text: String, bg: Color, fg: Color) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = bg)) {
        Text(text, color = fg, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontWeight = FontWeight.Bold, fontSize = 12.sp)
    }
}

@Composable
private fun SummaryCard(title: String, value: String, suffix: String, suffixColor: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(title, color = Soft, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(value, color = Ink, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp)
                Spacer(Modifier.width(6.dp))
                Text(suffix, color = suffixColor)
            }
        }
    }
}

@Composable
private fun CalendarScreen(modifier: Modifier = Modifier) {
    val sessions = listOf(
        SessionItem("IN PROGRESS", "Advanced Calculus Review", "14:00 - 15:30", Blue, "MATHEMATICS", "12 joined", "Join Now"),
        SessionItem("STARTS IN 2H", "History of Modern Europe", "17:30 - 18:30", Orange, "HISTORY", "4 joined", null),
        SessionItem("TONIGHT", "Organic Chemistry Prep", "20:00 - 21:00", Color(0xFF3AC99B), "SCIENCE", "8 joined", null)
    )

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Study Calendar", color = Ink, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            Box(Modifier.size(44.dp).background(Color(0xFFE8EFF8), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Text("+", color = Blue, fontWeight = FontWeight.Bold, fontSize = 24.sp)
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("October 2023", color = Ink, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            Row(Modifier.background(Color(0xFFE8EDF5), RoundedCornerShape(12.dp)).padding(4.dp)) {
                Box(Modifier.background(Color.White, RoundedCornerShape(10.dp)).padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Text("Week", color = Blue, fontWeight = FontWeight.Bold)
                }
                Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) { Text("Month", color = Soft, fontWeight = FontWeight.Bold) }
            }
        }
        Spacer(Modifier.height(12.dp))
        DateStrip()
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Todays Sessions", color = Ink, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
            Text("3 Scheduled", color = Blue, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        sessions.forEach { SessionCard(it) }
        Spacer(Modifier.height(12.dp))
        NowPlayingCard()
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun DateStrip() {
    val days = listOf("MON\n02", "TUE\n03", "WED\n04", "THU\n05", "FRI\n06", "SAT\n07", "SUN\n08")
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        days.forEachIndexed { i, label ->
            val selected = i == 3
            Box(
                Modifier.width(if (selected) 64.dp else 48.dp).background(if (selected) Blue else Color.Transparent, RoundedCornerShape(18.dp)).padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(label, color = if (selected) Color.White else Soft, fontWeight = FontWeight.Bold, lineHeight = 18.sp)
            }
        }
    }
}

@Composable
private fun SessionCard(item: SessionItem) {
    Card(Modifier.fillMaxWidth().padding(vertical = 7.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row {
            Box(Modifier.width(5.dp).height(150.dp).background(item.accent))
            Column(Modifier.fillMaxWidth().padding(14.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(item.status, color = item.accent, fontWeight = FontWeight.Bold)
                    Text(item.time, color = Soft, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(6.dp))
                Text(item.title, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Badge(item.subject, item.accent.copy(alpha = 0.14f), item.accent)
                    Spacer(Modifier.width(8.dp))
                    Text(item.joined, color = Soft)
                }
                if (item.action != null) {
                    Spacer(Modifier.height(10.dp))
                    Button(
                        onClick = {},
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Blue),
                        modifier = Modifier.align(Alignment.End)
                    ) { Text(item.action) }
                }
            }
        }
    }
}

@Composable
private fun NowPlayingCard() {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF0A1531))) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Next: Advanced Calculus", color = Color(0xFFB4C7EA))
                Text("Live in 5 mins", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            }
            Button(onClick = {}, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Blue)) {
                Text("Join Session")
            }
        }
    }
}

@Composable
private fun FocusScreen(modifier: Modifier = Modifier) {
    val modes = listOf("Focus", "Short Break", "Long Break")
    var mode by remember { mutableStateOf(0) }
    val tasks = listOf(
        FocusTaskItem("Exam: Advanced Calculus", "Due Tomorrow - Priority High", Color(0xFFFFE8CC)),
        FocusTaskItem("Task: Read Chapter 4 - Biology", "Estimated 2 sessions", Color(0xFFDDEBFA)),
        FocusTaskItem("Task: Practice Quiz - History", "15 questions left", Color(0xFFD9F3E3))
    )

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("=", color = Ink, fontWeight = FontWeight.Bold, fontSize = 30.sp)
            Text("Study Flow", color = Ink, fontWeight = FontWeight.Bold, fontSize = 34.sp)
            Text("#", color = Ink, fontWeight = FontWeight.Bold, fontSize = 24.sp)
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp).background(Color.White, RoundedCornerShape(12.dp)).padding(4.dp)) {
            modes.forEachIndexed { index, label ->
                Box(
                    Modifier.weight(1f).background(if (mode == index) Color(0xFFEAF2FF) else Color.Transparent, RoundedCornerShape(10.dp)).clickable { mode = index }.padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) { Text(label, color = if (mode == index) Blue else Soft, fontWeight = FontWeight.Bold) }
                if (index != modes.lastIndex) Spacer(Modifier.width(4.dp))
            }
        }

        Spacer(Modifier.height(24.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(260.dp)) {
                drawArc(Color(0xFFE2E9F3), 0f, 360f, false, style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round))
                drawArc(Blue, 160f, 240f, false, style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("25:00", color = Ink, fontWeight = FontWeight.ExtraBold, fontSize = 60.sp)
                Text("STUDY PHASE", color = Blue, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("Session 1 of 4", color = Soft, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(52.dp).background(Color(0xFFEAF0F8), CircleShape), contentAlignment = Alignment.Center) { Text("R", color = Soft, fontWeight = FontWeight.Bold) }
            Button(onClick = {}, shape = RoundedCornerShape(40.dp), colors = ButtonDefaults.buttonColors(containerColor = Blue), modifier = Modifier.width(180.dp).height(64.dp)) {
                Text("Start", fontSize = 20.sp)
            }
            Box(Modifier.size(52.dp).background(Color(0xFFEAF0F8), CircleShape), contentAlignment = Alignment.Center) { Text(">|", color = Soft, fontWeight = FontWeight.Bold) }
        }

        Spacer(Modifier.height(22.dp))
        Column(Modifier.fillMaxWidth().background(Color(0xFFEEF3F8), RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)).padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Focus List", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("+ Add Task", color = Blue, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            tasks.forEach { FocusTaskCard(it.title, it.subtitle, it.iconBg) }
        }
    }
}

@Composable
private fun FocusTaskCard(title: String, subtitle: String, iconBg: Color) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).background(iconBg, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Text("[]", color = Ink, fontSize = 11.sp) }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(subtitle, color = Soft)
            }
            Text(":", color = Color(0xFFC6D0DF), fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun StatsScreen(modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize().padding(16.dp)) {
        Text("Study Stats", color = Ink, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(12.dp))
        SummaryCard("WEEKLY FOCUS", "12.6h", "+18%", Green, Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        SummaryCard("COMPLETED", "28/34", "tasks", Soft, Modifier.fillMaxWidth())
    }
}

@Composable
private fun ProfileScreen(
    user: FirebaseUser,
    displayName: String,
    loading: Boolean,
    status: String,
    statusErr: Boolean,
    onDisplayName: (String) -> Unit,
    onSave: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxSize().padding(16.dp)) {
        Text("Profile", color = Ink, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
        Text("Signed in as ${user.email ?: user.uid}", color = Soft)
        Spacer(Modifier.height(12.dp))
        if (status.isNotBlank()) {
            Text(status, color = if (statusErr) Color(0xFFB00020) else Green, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(8.dp))
        }
        OutlinedTextField(
            value = displayName,
            onValueChange = onDisplayName,
            enabled = !loading,
            singleLine = true,
            label = { Text("Display Name") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        Button(onClick = onSave, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("Save Profile") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onLogout, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("Logout") }
    }
}
