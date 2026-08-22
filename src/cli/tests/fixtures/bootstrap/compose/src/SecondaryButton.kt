package com.legacy.ui

import androidx.compose.runtime.Composable

@Composable
fun SecondaryButton(appearance: String, onPress: () -> Unit) {
    PrimaryButton(appearance = appearance, disabled = false, onClick = onPress)
}
