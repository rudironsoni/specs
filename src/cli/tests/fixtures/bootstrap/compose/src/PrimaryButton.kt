package com.legacy.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview

@Composable
fun PrimaryButton(appearance: String, disabled: Boolean, onClick: () -> Unit) {
    // background #1a73e8
}

@Preview
@Composable
fun PrimaryButtonPreview() {
    PrimaryButton(appearance = "primary", disabled = false, onClick = {})
}
