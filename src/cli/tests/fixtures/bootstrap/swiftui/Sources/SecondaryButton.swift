import SwiftUI

struct SecondaryButton: View {
    var appearance: String
    var onPress: () -> Void

    var body: some View {
        PrimaryButton(appearance: appearance, disabled: false, onClick: onPress) // #1a74e8
    }
}
