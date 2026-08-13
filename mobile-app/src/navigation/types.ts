import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string; purpose: "REGISTRATION" | "LOGIN"; devOtp?: string };
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
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ComplaintTab: NavigatorScreenParams<MyTicketsStackParamList>;
  NoticeTab: NavigatorScreenParams<NoticeStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
