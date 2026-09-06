import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string; purpose: "REGISTRATION" | "LOGIN"; devOtp?: string };
  StaffLogin: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  DevelopmentWorksList: undefined;
  DevelopmentWorkDetail: { id: string };
  WelfareSchemesList: undefined;
  WelfareSchemeDetail: { id: string };
  BookAppointment: undefined;
  MyAppointments: undefined;
};

export type CampaignStackParamList = {
  Campaign: undefined;
};

export type FeedStackParamList = {
  FeedList: undefined;
  PostComments: { postId: string };
  UserProfile: { citizenId: string };
  HashtagPosts: { tag: string };
  Search: undefined;
};

export type MyTicketsStackParamList = {
  MyComplaints: undefined;
  NewComplaint: undefined;
  ComplaintDetail: { id: string };
};

export type NoticeStackParamList = {
  AnnouncementsList: undefined;
  AnnouncementDetail: { id: string };
};

export type ProfileStackParamList = {
  MoreMenu: undefined;
  EmergencyContacts: undefined;
  ContactMla: undefined;
  Notifications: undefined;
  VerificationRequest: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ComplaintTab: NavigatorScreenParams<MyTicketsStackParamList>;
  NoticeTab: NavigatorScreenParams<NoticeStackParamList>;
  CampaignTab: NavigatorScreenParams<CampaignStackParamList>;
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type AdminDashboardStackParamList = {
  AdminDashboard: undefined;
};

export type AdminComplaintsStackParamList = {
  AdminComplaintsList: undefined;
  AdminComplaintDetail: { id: string };
};

export type AdminMoreStackParamList = {
  AdminMoreMenu: undefined;
  AdminWards: undefined;
  AdminDepartments: undefined;
  AdminCategories: undefined;
  AdminStaff: undefined;
  AdminAnnouncements: undefined;
  AdminFeedModeration: undefined;
  AdminFeedAnalytics: undefined;
  AdminSettings: undefined;
  AdminReports: undefined;
  AdminCampaign: undefined;
};

export type AdminTabParamList = {
  AdminDashboardTab: NavigatorScreenParams<AdminDashboardStackParamList>;
  AdminComplaintsTab: NavigatorScreenParams<AdminComplaintsStackParamList>;
  AdminMoreTab: NavigatorScreenParams<AdminMoreStackParamList>;
};
