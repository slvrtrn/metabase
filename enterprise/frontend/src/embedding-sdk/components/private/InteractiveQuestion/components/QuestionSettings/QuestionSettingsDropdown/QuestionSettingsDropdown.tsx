import { InteractiveQuestion } from "embedding-sdk";
import { ActionIcon, Icon, Popover } from "metabase/ui";

export const QuestionSettingsDropdown = () => (
  <Popover>
    <Popover.Target>
      <ActionIcon>
        <Icon name="gear" />
      </ActionIcon>
    </Popover.Target>
    <Popover.Dropdown>
      <InteractiveQuestion.QuestionSettings />
    </Popover.Dropdown>
  </Popover>
);
