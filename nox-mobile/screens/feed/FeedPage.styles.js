import { StyleSheet } from "react-native";
import Colors from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77,163,255,0.2)',
  },
  headerLeftSpacer: {
    width: 44, // équilibre visuel (même largeur que l'espace du hamburger)
  },
  // ✅ AJOUT: Container pour le logo à gauche
  headerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLogoButton: {
    padding: 4,
  },
  floatingMenuButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.22)',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.35)',
    zIndex: 9999,
    elevation: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ✅ AJOUT: Container pour les boutons à droite du header
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // ✅ AJOUT: Bouton de notifications
  notificationsButton: {
    position: 'relative',
    padding: 8,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  createPostText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  feedTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.background,
  },
  feedTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTabActive: {},
  feedTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  feedTabTextActive: {
    color: '#fff',
  },
  feedTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 0, // ✅ MODIFICATION: Pas de padding pour un look plus compact
  },
  // ✅ MODIFICATION: Post card style Twitter/X - plus compact avec séparateur fin
  postCard: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  postHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  reportIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  // ✅ MODIFICATION: Avatar plus petit style Twitter/X
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDj: {
    backgroundColor: Colors.primary,
  },
  avatarBooker: {
    backgroundColor: '#4CAF50', // Vert pour différencier des DJs
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  postHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  // ✅ AJOUT: Ligne avec nom et badge
  postHeaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  postAuthorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  // ✅ AJOUT: Badge type de profil
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  badgeDj: {
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.4)',
  },
  badgeBooker: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  profileBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
    textTransform: 'uppercase',
  },
  // ✅ AJOUT: Ligne métadonnées
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  postMetaDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginHorizontal: 4,
  },
  // ✅ MODIFICATION: Contenu avec meilleure typographie
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    marginLeft: 52, // Aligné avec le contenu après l'avatar
  },
  // ✅ AJOUT: Container pour l'image
  postImageContainer: {
    marginLeft: 52,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
  },
  postImageFallback: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  postImageFallbackText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  // ✅ MODIFICATION: Actions plus visibles et espacées
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52,
    marginTop: 4,
    justifyContent: 'space-between',
    maxWidth: 300,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  postActionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  postActionTextLiked: {
    color: Colors.primary,
  },
  // ✅ AJOUT: Styles pour les commentaires
  commentsSection: {
    marginLeft: 52,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  commentsList: {
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commentAuthor: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
    marginRight: 8,
  },
  commentSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventBadge: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventInfo: {
    gap: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    flex: 1,
  },
  // ✅ AJOUT: Styles pour le modal de signalement
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#2a2a2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.2)',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },
  modalCancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

