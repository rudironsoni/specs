import SwiftUI

struct PrimaryButton: View {
    var appearance: String
    var disabled: Bool
    var onClick: () -> Void

    var body: some View {
        Button(action: onClick) {
            Text("Save")
        }
        .background(Color(red: 0.102, green: 0.451, blue: 0.91)) // #1a73e8
    }
}

#Preview {
    PrimaryButton(appearance: "primary", disabled: false, onClick: {})
}
