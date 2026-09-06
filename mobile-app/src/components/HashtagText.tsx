import { Text, type TextStyle } from "react-native";
import { colors } from "../theme";

const HASHTAG_PATTERN = /(#[a-zA-Z0-9_]+)/g;

export function HashtagText({
  content,
  style,
  onHashtagPress,
}: {
  content: string;
  style?: TextStyle;
  onHashtagPress: (tag: string) => void;
}) {
  const parts = content.split(HASHTAG_PATTERN);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Text key={i} style={{ color: colors.info, fontWeight: "600" }} onPress={() => onHashtagPress(part.slice(1))}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}
