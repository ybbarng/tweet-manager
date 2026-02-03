/** Twitter GraphQL 엔드포인트 및 쿼리 파라미터 */

export const ENDPOINTS = {
  VIEWER: 'https://x.com/i/api/graphql/uYkrgBYgRGvnmsaLOBDhnA/Viewer',
  USER_TWEETS: 'https://x.com/i/api/graphql/E3opETHurmVJflFsUBVuUQ/UserTweets',
  DELETE_TWEET:
    'https://x.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet',
  ACCOUNT_SETTINGS: 'https://api.x.com/1.1/account/settings.json',
} as const;

export const ACCOUNT_SETTINGS_PARAMS = {
  include_ext_sharing_audiospaces_listening_data_with_followers: 'true',
  include_mention_filter: 'true',
  include_nsfw_user_flag: 'true',
  include_nsfw_admin_flag: 'true',
  include_ranked_timeline: 'true',
  include_alt_text_compose: 'true',
  include_country_code: 'true',
};

export const VIEWER_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

export const DEFAULT_TWEET_COUNT = 20;

export function getUserTweetsVariables(
  userId: string,
  cursor?: string,
  count = DEFAULT_TWEET_COUNT,
) {
  const variables: Record<string, unknown> = {
    userId,
    count,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
  };
  if (cursor) {
    variables.cursor = cursor;
  }
  return variables;
}

export const USER_TWEETS_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

export function getDeleteTweetVariables(tweetId: string) {
  return {
    tweet_id: tweetId,
    dark_request: false,
  };
}
